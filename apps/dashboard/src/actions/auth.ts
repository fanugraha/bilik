"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const konfirmasiPassword = formData.get("konfirmasi_password") as string;

  if (password !== konfirmasiPassword) {
    redirect("/register?error=" + encodeURIComponent("Konfirmasi kata sandi tidak cocok"));
  }

  // Profil di tabel 'guru' dibuat trigger database dari metadata ini (PRD 7)
  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password,
    options: { data: { nama: (formData.get("nama") as string)?.trim() || null } },
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
