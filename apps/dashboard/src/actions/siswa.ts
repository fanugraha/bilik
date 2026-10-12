"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createSiswa(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const kelasId = formData.get("kelas_id") as string;
  const nama = formData.get("nama") as string;
  const noAbsen = parseInt(formData.get("no_absen") as string);

  const { error } = await supabase.from("siswa").insert({
    kelas_id: kelasId,
    nama,
    no_absen: noAbsen,
  });

  if (error) {
    redirect(`/dashboard/kelas/${kelasId}/siswa?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/kelas/${kelasId}/siswa`);
  redirect(`/dashboard/kelas/${kelasId}/siswa`);
}

export async function updateSiswa(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const kelasId = formData.get("kelas_id") as string;
  const nama = formData.get("nama") as string;
  const noAbsen = parseInt(formData.get("no_absen") as string);

  const { error } = await supabase
    .from("siswa")
    .update({ nama, no_absen: noAbsen })
    .eq("id", id);

  if (error) {
    redirect(`/dashboard/kelas/${kelasId}/siswa?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/kelas/${kelasId}/siswa`);
  redirect(`/dashboard/kelas/${kelasId}/siswa`);
}

export async function deleteSiswa(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const kelasId = formData.get("kelas_id") as string;

  const { error } = await supabase.from("siswa").delete().eq("id", id);

  if (error) {
    redirect(`/dashboard/kelas/${kelasId}/siswa?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/kelas/${kelasId}/siswa`);
  redirect(`/dashboard/kelas/${kelasId}/siswa`);
}
