import type { SupabaseClient } from "@supabase/supabase-js";

export type MapelRingkas = { id: string; nama: string };

// Daftar mapel dari master (satu sumber), dipakai isian dropdown
export async function ambilDaftarMapel(supabase: SupabaseClient): Promise<MapelRingkas[]> {
  const { data } = await supabase.from("mapel").select("id, nama").order("nama", { ascending: true });
  return data ?? [];
}

// mapel_id dari form -> { mapel_id, mapel } (nama diisi trigger DB; di sini hanya diteruskan id)
export async function uraikanMapel(supabase: SupabaseClient, mapelId: string | null) {
  if (!mapelId) return { mapel_id: null };
  const { data } = await supabase.from("mapel").select("id").eq("id", mapelId).maybeSingle();
  return { mapel_id: data?.id ?? null };
}

// Buat mapel baru dari nama yang diketik guru. Bila slug-nya sudah ada, pakai yang lama
// (jangan menimpa nama master). RLS mengizinkan guru menambah ke master.
export async function pastikanMapel(supabase: SupabaseClient, nama: string): Promise<string | null> {
  const bersih = nama.trim().replace(/\s+/g, " ");
  if (!bersih) return null;
  const slug = bersih.toLowerCase();
  const { data: baru } = await supabase
    .from("mapel")
    .upsert({ nama: bersih, slug }, { onConflict: "slug", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  if (baru) return baru.id as string;
  const { data: ada } = await supabase.from("mapel").select("id").eq("slug", slug).maybeSingle();
  return (ada?.id as string) ?? null;
}

// Resolusi mapel dari form: utamakan mapel baru yang diketik, kalau tidak ada pakai mapel_id terpilih
export async function mapelDariForm(supabase: SupabaseClient, formData: FormData) {
  const namaBaru = ((formData.get("mapel_baru") as string) ?? "").trim();
  if (namaBaru) return { mapel_id: await pastikanMapel(supabase, namaBaru) };
  return uraikanMapel(supabase, (formData.get("mapel_id") as string) || null);
}
