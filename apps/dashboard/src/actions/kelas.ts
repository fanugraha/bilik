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
  const { data: kelas, error } = await supabase
    .from("kelas")
    .insert({
      guru_id: user.id,
      nama,
    })
    .select("id")
    .single();

  if (error || !kelas) {
    const pesan = error?.code === "23505" ? "Nama kelas itu sudah ada. Pakai nama lain." : (error?.message ?? "Kelas gagal dibuat");
    redirect("/dashboard/kelas?error=" + encodeURIComponent(pesan));
  }

  // Langkah berikutnya setelah membuat kelas adalah mengisi siswanya
  revalidatePath("/dashboard/kelas");
  redirect(`/dashboard/kelas/${kelas.id}/siswa?sukses=` + encodeURIComponent(`Kelas ${nama} dibuat. Sekarang masukkan siswanya.`));
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
    const pesan = error.code === "23505" ? "Nama kelas itu sudah ada. Pakai nama lain." : error.message;
    redirect("/dashboard/kelas?error=" + encodeURIComponent(pesan));
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
