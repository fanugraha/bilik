"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cekKataSandiBaru } from "@/lib/profil";
import { rapikanNamaOrang } from "@/lib/nama";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/dashboard");
}

// Login/daftar lewat Google. Akun guru dibuat otomatis oleh trigger database saat pertama masuk.
export async function loginDenganGoogle() {
  const supabase = await createClient();
  const alamatSitus = ambilAlamatSitus();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${alamatSitus}/auth/callback` },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect(data.url);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const konfirmasiPassword = formData.get("konfirmasi_password") as string;

  const errorKataSandi = cekKataSandiBaru(password, konfirmasiPassword);
  if (errorKataSandi) redirect("/register?error=" + encodeURIComponent(errorKataSandi));

  // Profil di tabel 'guru' dibuat trigger database dari metadata ini (PRD 7)
  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password,
    options: { data: { nama: rapikanNamaOrang((formData.get("nama") as string) ?? "") || null } },
  });

  if (error) {
    redirect("/register?error=" + encodeURIComponent(error.message));
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Alamat situs untuk link di email. Sengaja TIDAK diambil dari header Host/X-Forwarded-Host:
// header bisa dipalsukan sehingga link reset di email guru mengarah ke situs penyerang.
function ambilAlamatSitus() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("NEXT_PUBLIC_SITE_URL wajib diatur di produksi");
}

export async function kirimLinkLupaPassword(formData: FormData) {
  const supabase = await createClient();
  const email = (formData.get("email") as string)?.trim();

  if (!email) redirect("/lupa-password?error=" + encodeURIComponent("Email wajib diisi"));

  const alamatSitus = ambilAlamatSitus();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${alamatSitus}/auth/callback?next=/atur-ulang-password`,
  });

  // Batas kirim email dari Supabase perlu diberitahukan; error lain disamarkan
  // agar halaman ini tidak bisa dipakai menebak email yang terdaftar.
  if (error?.status === 429) {
    redirect("/lupa-password?error=" + encodeURIComponent("Terlalu sering meminta link. Coba lagi beberapa menit lagi."));
  }

  redirect(
    "/lupa-password?sukses=" +
      encodeURIComponent("Jika email terdaftar, link atur ulang kata sandi sudah dikirim. Cek juga folder spam."),
  );
}

export async function aturUlangPassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/lupa-password?error=" + encodeURIComponent("Link sudah kedaluwarsa. Minta link baru."));
  }

  const password = formData.get("password") as string;
  const konfirmasiPassword = formData.get("konfirmasi_password") as string;

  const errorKataSandi = cekKataSandiBaru(password, konfirmasiPassword);
  if (errorKataSandi) redirect("/atur-ulang-password?error=" + encodeURIComponent(errorKataSandi));

  const { error } = await supabase.auth.updateUser({ password });

  if (error) redirect("/atur-ulang-password?error=" + encodeURIComponent(error.message));

  redirect("/dashboard");
}
