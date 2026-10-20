import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cepDigits, formatCep, lookupCep, type PostalAddress } from "@/lib/postal-address";

export function CepInput({ value, onChange, onAddress }: {
  value: string;
  onChange: (value: string) => void;
  onAddress: (address: PostalAddress) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const latest = useRef({ value, onAddress });
  latest.current = { value, onAddress };
  useEffect(() => () => request.current?.abort(), []);

  async function change(raw: string) {
    request.current?.abort();
    const formatted = formatCep(raw);
    onChange(formatted);
    setError("");
    setLoading(false);
    if (cepDigits(formatted).length !== 8) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    const timeout = setTimeout(() => controller.abort("timeout"), 8000);
    try {
      const address = await lookupCep(formatted, controller.signal);
      if (!controller.signal.aborted && cepDigits(latest.current.value) === cepDigits(formatted)) {
        latest.current.onAddress(address);
      }
    } catch (cause) {
      if (request.current === controller && (!controller.signal.aborted || controller.signal.reason === "timeout")) {
        setError(cause instanceof Error && !controller.signal.aborted
          ? cause.message
          : "Consulta indisponível. Preencha o endereço manualmente.");
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input aria-label="CEP" aria-busy={loading} inputMode="numeric" autoComplete="postal-code"
          value={value} maxLength={9} onChange={(event) => void change(event.target.value)} className="pr-9" />
        {loading && <LoaderCircle aria-label="Consultando CEP" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground motion-reduce:animate-none" />}
      </div>
      {error && <p role="status" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}