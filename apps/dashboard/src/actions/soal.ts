"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const HURUF_OPSI = ["A", "B", "C", "D", "E"];

// Opsi harus berurutan (A, B, C, ...). Ada celah (mis. A, B, D) membuat huruf kunci
// tidak cocok lagi dengan posisi opsi yang tersimpan, jadi ditolak.
function ambilOpsi(formData: FormData): { opsi: string[]; adaCelah: boolean } {
  const opsi: string[] = [];
  let sudahKosong = false;
  let adaCelah = false;
  for (const huruf of HURUF_OPSI) {
    const isi = (formData.get(`opsi_${huruf}`) as string)?.trim();
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

export async function createSoal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tipe = formData.get("tipe") as string;
  const teks = (formData.get("teks") as string)?.trim();
  const bobot = parseFloat(formData.get("bobot") as string) || 1;

  if (!teks) redirect("/dashboard/soal/buat?error=" + encodeURIComponent("Teks soal wajib diisi"));

  if (tipe === "pg") {
    const { opsi, adaCelah } = ambilOpsi(formData);
    const kunci = formData.get("kunci") as string | null;
    const pesanOpsi = cekOpsiPg(opsi, adaCelah, kunci);
    if (pesanOpsi) redirect("/dashboard/soal/buat?error=" + encodeURIComponent(pesanOpsi));
    const { error } = await supabase.from("soal").insert({
      guru_id: user.id,
      tipe: "pg",
      teks,
      opsi,
      kunci,
      bobot,
    });
    if (error) redirect("/dashboard/soal/buat?error=" + encodeURIComponent(error.message));
  } else if (tipe === "benar_salah") {
    const jawabanBenar = formData.get("jawaban_benar") === "true";
    const penjelasan = (formData.get("penjelasan") as string)?.trim() || null;
    const { error } = await supabase.from("soal").insert({
      guru_id: user.id,
      tipe: "benar_salah",
      teks,
      jawaban_benar: jawabanBenar,
      penjelasan,
      bobot,
    });
    if (error) redirect("/dashboard/soal/buat?error=" + encodeURIComponent(error.message));
  } else {
    const pedoman = (formData.get("pedoman") as string)?.trim() || null;
    const { error } = await supabase.from("soal").insert({
      guru_id: user.id,
      tipe: "essay",
      teks,
      pedoman,
      bobot,
    });
    if (error) redirect("/dashboard/soal/buat?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/dashboard/soal");
  redirect("/dashboard/soal");
}

export async function updateSoal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const tipe = formData.get("tipe") as string;
  const teks = (formData.get("teks") as string)?.trim();
  const bobot = parseFloat(formData.get("bobot") as string) || 1;

  if (!teks) redirect(`/dashboard/soal/${id}/ubah?error=` + encodeURIComponent("Teks soal wajib diisi"));

  let payload: Record<string, unknown>;
  if (tipe === "pg") {
    const { opsi, adaCelah } = ambilOpsi(formData);
    const kunci = formData.get("kunci") as string | null;
    const pesanOpsi = cekOpsiPg(opsi, adaCelah, kunci);
    if (pesanOpsi) redirect(`/dashboard/soal/${id}/ubah?error=` + encodeURIComponent(pesanOpsi));
    payload = { tipe: "pg", teks, opsi, kunci, pedoman: null, jawaban_benar: null, penjelasan: null, bobot };
  } else if (tipe === "benar_salah") {
    const jawabanBenar = formData.get("jawaban_benar") === "true";
    const penjelasan = (formData.get("penjelasan") as string)?.trim() || null;
    payload = { tipe: "benar_salah", teks, jawaban_benar: jawabanBenar, penjelasan, bobot, opsi: [], kunci: null, pedoman: null };
  } else {
    const pedoman = (formData.get("pedoman") as string)?.trim() || null;
    payload = { tipe: "essay", teks, pedoman, bobot, opsi: [], kunci: null, jawaban_benar: null, penjelasan: null };
  }

  const { error } = await supabase
    .from("soal")
    .update(payload)
    .eq("id", id)
    .eq("guru_id", user.id);

  if (error) redirect(`/dashboard/soal/${id}/ubah?error=` + encodeURIComponent(error.message));

  revalidatePath("/dashboard/soal");
  redirect("/dashboard/soal");
}

export async function deleteSoal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const { error } = await supabase.from("soal").delete().eq("id", id).eq("guru_id", user.id);

  if (error) redirect("/dashboard/soal?error=" + encodeURIComponent(error.message));

  revalidatePath("/dashboard/soal");
  redirect("/dashboard/soal");
}
