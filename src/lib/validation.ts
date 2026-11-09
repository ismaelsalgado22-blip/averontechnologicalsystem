export const digits = (value: string) => value.replace(/\D/g, '');
export function validDocument(value: string, kind: 'pf' | 'pj') {
  if (!value.trim()) return true;
  const d = digits(value); if (/^(\d)\1+$/.test(d)) return false;
  const checksum = (part: string, weights: number[]) => { const sum = [...part].reduce((total, n, i) => total + Number(n) * (weights[i] ?? 0), 0); return sum % 11 < 2 ? 0 : 11 - sum % 11; };
  if (kind === 'pf') return d.length === 11 && checksum(d.slice(0,9), [10,9,8,7,6,5,4,3,2]) === Number(d[9]) && checksum(d.slice(0,10), [11,10,9,8,7,6,5,4,3,2]) === Number(d[10]);
  return d.length === 14 && checksum(d.slice(0,12), [5,4,3,2,9,8,7,6,5,4,3,2]) === Number(d[12]) && checksum(d.slice(0,13), [6,5,4,3,2,9,8,7,6,5,4,3,2]) === Number(d[13]);
}
export function validateContact(value: { name?: string; document?: string; kind?: string; phone?: string; whatsapp?: string; email?: string }) {
  if (!value.name || value.name.trim().length < 3) throw new Error('Informe o nome ou razão social');
  if (!validDocument(value.document ?? '', value.kind === 'pf' ? 'pf' : 'pj')) throw new Error(value.kind === 'pf' ? 'CPF inválido' : 'CNPJ inválido');
  for (const p of [value.phone, value.whatsapp]) if (p?.trim() && ![10,11,12,13].includes(digits(p).length)) throw new Error('Telefone inválido');
  if (value.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) throw new Error('E-mail inválido');
}
export function localDateTime(iso: string) { const d = new Date(iso); const pad = (v: number) => String(v).padStart(2, '0'); return { date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; }