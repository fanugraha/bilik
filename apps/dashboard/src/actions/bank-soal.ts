"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function halamanBank(bank: string, error?: string) {
  const param = new URLSearchParams();
  if (bank) param.set("bank", bank);
  if (error) param.set("error", error);
  const teksParam = param.toString();
  return teksParam ? `/dashboard/soal?${teksParam}` : "/dashboard/soal";
}

export async function createBank(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const nama = (formData.get("nama") as string)?.trim();
  if (!nama) redirect(halamanBank("", "Nama bank wajib diisi"));

  const { error } = await supabase.from("bank_soal").insert({ guru_id: user.id, nama });

  if (error) redirect(halamanBank("", error.message));

  revalidatePath("/dashboard/soal");
  redirect("/dashboard/soal");
}

export async function updateBank(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const nama = (formData.get("nama") as string)?.trim();
  if (!id) redirect("/dashboard/soal");
  if (!nama) redirect(halamanBank(id, "Nama bank wajib diisi"));

  const { error } = await supabase.from("bank_soal").update({ nama }).eq("id", id).eq("guru_id", user.id);

  if (error) redirect(halamanBank(id, error.message));

  revalidatePath("/dashboard/soal");
  redirect(halamanBank(id));
}

export async function deleteBank(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;

  // Soal ikut bank? Tidak: bank_soal_id di soal jadi null (on delete set null).
  const { error } = await supabase.from("bank_soal").delete().eq("id", id).eq("guru_id", user.id);

  if (error) redirect(halamanBank("", error.message));

  revalidatePath("/dashboard/soal");
  redirect("/dashboard/soal");
}
