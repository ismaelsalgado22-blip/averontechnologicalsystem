import { supabase } from "@/integrations/supabase/client";

const BUCKET = "mecfrio";

export async function uploadFile(file: File, folder: string) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function signedUrl(path: string, seconds = 3600) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? "";
}

export async function signedUrls(paths: string[]) {
  const out = await Promise.all(paths.map(async (p) => [p, await signedUrl(p)] as const));
  return Object.fromEntries(out) as Record<string, string>;
}

export async function removeFile(path: string) {
  if (!path || path.startsWith("http")) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

/** Converte imagem do storage em dataURL, para embutir em PDF. */
export async function toDataUrl(path: string) {
  const url = await signedUrl(path);
  if (!url) return "";
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}
