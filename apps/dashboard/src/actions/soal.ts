"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function ambilOpsi(formData: FormData): string[] {
  const huruf = ["A", "B", "C", "D", "E"];
  const opsi: string[] = [];
  for (const h of huruf) {
    const v = (formData.get(`opsi_${h}`) as string)?.trim();
    if (v) opsi.push(v);
  }
  return opsi;
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
    const opsi = ambilOpsi(formData);
    const kunci = formData.get("kunci") as string;
    if (opsi.length < 2)
      redirect("/dashboard/soal/buat?error=" + encodeURIComponent("PG butuh minimal 2 opsi"));
    const idx = kunci.charCodeAt(0) - 65;
    if (!kunci || idx < 0 || idx >= opsi.length)
      redirect("/dashboard/soal/buat?error=" + encodeURIComponent("Kunci tidak cocok dengan opsi"));
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
    const opsi = ambilOpsi(formData);
    const kunci = formData.get("kunci") as string;
    if (opsi.length < 2)
      redirect(`/dashboard/soal/${id}/ubah?error=` + encodeURIComponent("PG butuh minimal 2 opsi"));
    payload = { teks, opsi, kunci, pedoman: null, bobot };
  } else if (tipe === "benar_salah") {
    const jawabanBenar = formData.get("jawaban_benar") === "true";
    const penjelasan = (formData.get("penjelasan") as string)?.trim() || null;
    payload = { teks, jawaban_benar: jawabanBenar, penjelasan, bobot, opsi: [], kunci: null, pedoman: null };
  } else {
    const pedoman = (formData.get("pedoman") as string)?.trim() || null;
    payload = { teks, pedoman, bobot, opsi: [], kunci: null, jawaban_benar: null, penjelasan: null };
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
