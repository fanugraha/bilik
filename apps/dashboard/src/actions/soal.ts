"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { amankanTujuanKembali } from "@/lib/alur";

const HURUF_OPSI = ["A", "B", "C", "D", "E"];

// Rapikan teks soal: samakan akhir baris jadi \n lalu potong spasi ujung,
// agar baris baru yang diketik guru tidak hilang / campur CRLF.
function rapikanTeks(v: unknown): string {
  return String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

// Opsi harus berurutan (A, B, C, ...). Ada celah (mis. A, B, D) membuat huruf kunci
// tidak cocok lagi dengan posisi opsi yang tersimpan, jadi ditolak.
function ambilOpsi(formData: FormData): { opsi: string[]; adaCelah: boolean } {
  const opsi: string[] = [];
  let sudahKosong = false;
  let adaCelah = false;
  for (const huruf of HURUF_OPSI) {
    const isi = rapikanTeks(formData.get(`opsi_${huruf}`));
    if (!isi) {
      sudahKosong = true;
      continue;
    }
    if (sudahKosong) adaCelah = true;
    opsi.push(isi);
  }
  return { opsi, adaCelah };
}

function cekOpsiPg(opsi: string[], adaCelah: boolean, kunci: string | null): string | null {
  if (adaCelah) return "Isi pilihan jawaban berurutan tanpa melompat (A, B, C, ...)";
  if (opsi.length < 2) return "Pilihan ganda butuh minimal 2 pilihan";
  const indeksKunci = kunci ? HURUF_OPSI.indexOf(kunci) : -1;
  if (indeksKunci < 0 || indeksKunci >= opsi.length) return "Kunci jawaban harus salah satu pilihan yang terisi";
  return null;
}

// Bank soal wajib dan harus milik guru sendiri (FK tidak cek RLS, jadi dicek manual).
async function bankMilik(supabase: Awaited<ReturnType<typeof createClient>>, guruId: string, bankId: string | null) {
  if (!bankId) return null;
  const { data } = await supabase.from("bank_soal").select("id").eq("id", bankId).eq("guru_id", guruId).maybeSingle();
  return data?.id ?? null;
}

// Isian soal sesuai tipe. Kolom milik tipe lain dikosongkan agar soal yang ganti tipe tidak membawa sisa data.
function susunIsianSoal(formData: FormData): { isian: Record<string, unknown> } | { error: string } {
  const tipe = formData.get("tipe") as string;
  const teks = rapikanTeks(formData.get("teks"));
  const bobot = parseFloat(formData.get("bobot") as string) || 1;

  if (!teks) return { error: "Teks soal wajib diisi" };

  if (tipe === "pg") {
    const { opsi, adaCelah } = ambilOpsi(formData);
    const kunci = formData.get("kunci") as string | null;
    const pesanOpsi = cekOpsiPg(opsi, adaCelah, kunci);
    if (pesanOpsi) return { error: pesanOpsi };
    return { isian: { tipe: "pg", teks, opsi, kunci, pedoman: null, jawaban_benar: null, penjelasan: null, bobot } };
  }
  if (tipe === "benar_salah") {
    const jawabanBenar = formData.get("jawaban_benar") === "true";
    const penjelasan = rapikanTeks(formData.get("penjelasan")) || null;
    return { isian: { tipe: "benar_salah", teks, jawaban_benar: jawabanBenar, penjelasan, bobot, opsi: [], kunci: null, pedoman: null } };
  }
  if (tipe === "angket") {
    // Skala tetap 1-4; skor dari pilihan siswa, jadi bobot tidak dipakai.
    return { isian: { tipe: "angket", teks, opsi: [], kunci: null, jawaban_benar: null, penjelasan: null, pedoman: null, bobot: 1 } };
  }
  const pedoman = rapikanTeks(formData.get("pedoman")) || null;
  return { isian: { tipe: "essay", teks, pedoman, bobot, opsi: [], kunci: null, jawaban_benar: null, penjelasan: null } };
}

function halamanTulisSoal(bankId: string | null, kembali: string | null, pesan: { error?: string; sukses?: string }) {
  const param = new URLSearchParams();
  if (bankId) param.set("bank", bankId);
  if (kembali) param.set("kembali", kembali);
  if (pesan.error) param.set("error", pesan.error);
  if (pesan.sukses) param.set("sukses", pesan.sukses);
  return `/dashboard/soal/buat?${param.toString()}`;
}

export async function createSoal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const bankDiminta = (formData.get("bank_soal_id") as string) || null;
  const kembali = amankanTujuanKembali(formData.get("kembali") as string);
  const bankId = await bankMilik(supabase, user.id, bankDiminta);
  if (!bankId) redirect(halamanTulisSoal(bankDiminta, kembali, { error: "Pilih bank soal untuk soal ini" }));

  const hasil = susunIsianSoal(formData);
  if ("error" in hasil) redirect(halamanTulisSoal(bankId, kembali, { error: hasil.error }));

  const { error } = await supabase.from("soal").insert({ ...hasil.isian, guru_id: user.id, bank_soal_id: bankId });
  if (error) redirect(halamanTulisSoal(bankId, kembali, { error: error.message }));

  revalidatePath("/dashboard/soal");
  if (formData.get("lanjut") === "lagi") redirect(halamanTulisSoal(bankId, kembali, { sukses: "Soal disimpan. Tulis soal berikutnya." }));
  if (kembali) redirect(kembali);
  redirect(`/dashboard/soal/bank/${bankId}?sukses=` + encodeURIComponent("Soal disimpan"));
}

export async function updateSoal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const halamanUbah = (pesan: string) => `/dashboard/soal/${id}/ubah?error=` + encodeURIComponent(pesan);

  const bankId = await bankMilik(supabase, user.id, (formData.get("bank_soal_id") as string) || null);
  if (!bankId) redirect(halamanUbah("Pilih bank soal untuk soal ini"));

  const hasil = susunIsianSoal(formData);
  if ("error" in hasil) redirect(halamanUbah(hasil.error));

  const { error } = await supabase
    .from("soal")
    .update({ ...hasil.isian, bank_soal_id: bankId })
    .eq("id", id)
    .eq("guru_id", user.id);

  if (error) redirect(halamanUbah(error.message));

  revalidatePath("/dashboard/soal");
  redirect(`/dashboard/soal/bank/${bankId}?sukses=` + encodeURIComponent("Perubahan soal disimpan"));
}

export async function deleteSoal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const bankId = formData.get("bank_soal_id") as string;
  const halaman = bankId ? `/dashboard/soal/bank/${bankId}` : "/dashboard/soal";
  const { error } = await supabase.from("soal").delete().eq("id", id).eq("guru_id", user.id);

  if (error) redirect(`${halaman}?error=` + encodeURIComponent(error.message));

  revalidatePath("/dashboard/soal");
  redirect(`${halaman}?sukses=` + encodeURIComponent("Soal dihapus"));
}
