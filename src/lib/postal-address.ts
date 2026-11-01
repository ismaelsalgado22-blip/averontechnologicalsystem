export type PostalAddress = { address: string; district: string; city: string; state: string };

export function cepDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function formatCep(value: string) {
  return cepDigits(value).replace(/^(\d{5})(\d)/, "$1-$2");
}

export async function lookupCep(value: string, signal?: AbortSignal): Promise<PostalAddress> {
  const cep = cepDigits(value);
  if (cep.length !== 8) throw new Error("Informe um CEP com 8 dígitos.");
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: signal ?? null });
  if (!response.ok) throw new Error("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
  const data = await response.json();
  if (data.erro) throw new Error("CEP não encontrado. Confira o número ou preencha o endereço manualmente.");
  if (typeof data.localidade !== "string" || typeof data.uf !== "string") {
    throw new Error("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
  }
  return { address: data.logradouro || "", district: data.bairro || "", city: data.localidade, state: data.uf };
}

// City-wide CEPs may omit street/district; preserve manually entered values.
export function mergePostalAddress<T extends PostalAddress>(current: T, found: PostalAddress): T {
  return { ...current, ...Object.fromEntries(Object.entries(found).filter(([, value]) => value !== "")) };
}