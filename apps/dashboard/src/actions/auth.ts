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

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error, data: authData } = await supabase.auth.signUp(data);

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  if (authData.user) {
    // Simpan profil guru ke tabel 'guru' (PRD 7)
    await supabase.from("guru").insert({
      id: authData.user.id,
      email: authData.user.email,
      nama: formData.get("nama") as string || authData.user.email?.split("@")[0] || "Guru",
    });
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
