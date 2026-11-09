import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
export type PostalAddress = { address: string; district: string; city: string; state: string };
export function CepInput({ value, onChange, onAddress }: { value: string; onChange: (v: string) => void; onAddress: (v: PostalAddress) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const handler = useRef(onAddress); handler.current = onAddress;
  useEffect(() => {
    const cep = value.replace(/\D/g, ''); if (cep.length !== 8) { setError(''); return; }
    const abort = new AbortController(); const timeout = setTimeout(() => abort.abort(), 8000); let active = true;
    setBusy(true); setError('');
    fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: abort.signal }).then(async r => { if (!r.ok) throw new Error(); const data = await r.json(); if (data.erro) throw new Error(); if (active) handler.current({ address: data.logradouro ?? '', district: data.bairro ?? '', city: data.localidade ?? '', state: data.uf ?? '' }); }).catch(() => { if (active) setError('CEP não encontrado. Preencha o endereço manualmente.'); }).finally(() => { if (active) setBusy(false); clearTimeout(timeout); });
    return () => { active = false; abort.abort(); clearTimeout(timeout); };
  }, [value]);
  return <div className="space-y-1"><div className="relative"><Input aria-label="CEP" aria-busy={busy} inputMode="numeric" value={value} maxLength={9} onChange={e => { const d = e.target.value.replace(/\D/g,'').slice(0,8); onChange(d.length>5 ? `${d.slice(0,5)}-${d.slice(5)}` : d); }}/>{busy && <Loader2 className="absolute right-3 top-3 size-4 animate-spin"/>}</div>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}