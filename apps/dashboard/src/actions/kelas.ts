"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createKelas(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const nama = formData.get("nama") as string;
  const { error } = await supabase.from("kelas").insert({
    guru_id: user.id,
    nama,
  });

  if (error) {
    redirect("/dashboard/kelas?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/dashboard/kelas");
  redirect("/dashboard/kelas");
}

export async function updateKelas(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const nama = formData.get("nama") as string;

  const { error } = await supabase
    .from("kelas")
    .update({ nama })
    .eq("id", id)
    .eq("guru_id", user.id);

  if (error) {
    redirect("/dashboard/kelas?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/dashboard/kelas");
  redirect("/dashboard/kelas");
}

export async function deleteKelas(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("kelas")
    .delete()
    .eq("id", id)
    .eq("guru_id", user.id);

  if (error) {
    redirect("/dashboard/kelas?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/dashboard/kelas");
  redirect("/dashboard/kelas");
}
