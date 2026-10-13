"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cekKataSandiBaru, cekNamaGuru, punyaLoginEmail } from "@/lib/profil";

const TAB_PROFIL = "/dashboard/profil";
const TAB_KEAMANAN = "/dashboard/profil?tab=keamanan";

function kembaliKe(tab: string, jenis: "error" | "sukses", pesan: string): never {
  redirect(`${tab}${tab.includes("?") ? "&" : "?"}${jenis}=` + encodeURIComponent(pesan));
}

export async function simpanProfil(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const hasil = cekNamaGuru((formData.get("nama") as string) ?? "");
  if ("error" in hasil) kembaliKe(TAB_PROFIL, "error", hasil.error);

  // Hanya kolom nama: policy UPDATE guru tidak membatasi kolom, jadi email jangan ikut dikirim.
  // RLS yang menolak tidak memberi error, hanya 0 baris; minta baris kembali agar ketahuan.
  const { data: barisDiubah, error } = await supabase.from("guru").update({ nama: hasil.nama }).eq("id", user.id).select("id");
  if (error) kembaliKe(TAB_PROFIL, "error", error.message);
  if (!barisDiubah?.length) kembaliKe(TAB_PROFIL, "error", "Profil tidak tersimpan. Coba keluar lalu masuk lagi.");

  revalidatePath("/dashboard", "layout");
  kembaliKe(TAB_PROFIL, "sukses", "Nama disimpan");
}

export async function ubahKataSandi(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const akunEmail = punyaLoginEmail(user);
  const password = (formData.get("password") as string) ?? "";
  const kataSandiLama = akunEmail ? ((formData.get("kata_sandi_lama") as string) ?? "") : undefined;
  if (akunEmail && !kataSandiLama) kembaliKe(TAB_KEAMANAN, "error", "Kata sandi lama wajib diisi");

  const errorKataSandi = cekKataSandiBaru(password, (formData.get("konfirmasi_password") as string) ?? "", kataSandiLama);
  if (errorKataSandi) kembaliKe(TAB_KEAMANAN, "error", errorKataSandi);

  // Akun email wajib membuktikan kata sandi lama, agar orang yang memakai sesi yang
  // tertinggal terbuka tidak bisa mengambil alih akun. Akun Google cukup sesinya.
  if (akunEmail) {
    const { error: errorLama } = await supabase.auth.signInWithPassword({ email: user.email!, password: kataSandiLama! });
    if (errorLama) kembaliKe(TAB_KEAMANAN, "error", "Kata sandi lama salah");
  }

  const { error } = await supabase.auth.updateUser({ password });
  // Akun Google yang pernah membuat kata sandi: Supabase sendiri menolak kata sandi yang sama
  if (error?.code === "same_password") kembaliKe(TAB_KEAMANAN, "error", "Kata sandi baru harus berbeda dari kata sandi lama");
  if (error) kembaliKe(TAB_KEAMANAN, "error", error.message);

  kembaliKe(TAB_KEAMANAN, "sukses", "Kata sandi disimpan");
}
