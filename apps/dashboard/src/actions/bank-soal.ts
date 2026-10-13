"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapelDariForm } from "@/lib/mapel";

function halamanBank(id: string, pesan?: { error?: string; sukses?: string }) {
  const param = new URLSearchParams();
  if (pesan?.error) param.set("error", pesan.error);
  if (pesan?.sukses) param.set("sukses", pesan.sukses);
  const teksParam = param.toString();
  return `/dashboard/soal/bank/${id}${teksParam ? `?${teksParam}` : ""}`;
}

function ambilNamaBank(formData: FormData) {
  return ((formData.get("nama") as string) ?? "").trim().replace(/\s+/g, " ");
}

export async function createBank(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const nama = ambilNamaBank(formData);
  const { mapel_id } = await mapelDariForm(supabase, formData);
  if (!nama) redirect("/dashboard/soal/bank/buat?error=" + encodeURIComponent("Nama bank wajib diisi"));

  const { data: bank, error } = await supabase
    .from("bank_soal")
    .insert({ guru_id: user.id, nama, mapel_id })
    .select("id")
    .single();

  if (error || !bank) {
    const pesan = error?.code === "23505" ? "Nama bank itu sudah ada. Pakai nama lain." : (error?.message ?? "Bank gagal dibuat");
    redirect("/dashboard/soal/bank/buat?error=" + encodeURIComponent(pesan));
  }

  revalidatePath("/dashboard/soal");
  redirect(halamanBank(bank.id));
}

export async function updateBank(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const nama = ambilNamaBank(formData);
  const { mapel_id } = await mapelDariForm(supabase, formData);
  if (!id) redirect("/dashboard/soal");
  if (!nama) redirect(halamanBank(id, { error: "Nama bank wajib diisi" }));

  const { error } = await supabase.from("bank_soal").update({ nama, mapel_id }).eq("id", id).eq("guru_id", user.id);

  if (error) {
    const pesan = error.code === "23505" ? "Nama bank itu sudah ada. Pakai nama lain." : error.message;
    redirect(halamanBank(id, { error: pesan }));
  }

  revalidatePath("/dashboard/soal");
  redirect(halamanBank(id, { sukses: "Bank disimpan" }));
}

export async function deleteBank(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;

  // Bank yang masih berisi soal ditolak database (on delete restrict); beri pesan yang jelas lebih dulu
  const { count } = await supabase.from("soal").select("id", { count: "exact", head: true }).eq("bank_soal_id", id);
  if ((count ?? 0) > 0) {
    redirect(halamanBank(id, { error: `Bank masih berisi ${count} soal. Pindahkan atau hapus soalnya dulu.` }));
  }

  const { error } = await supabase.from("bank_soal").delete().eq("id", id).eq("guru_id", user.id);

  if (error) redirect(halamanBank(id, { error: error.message }));

  revalidatePath("/dashboard/soal");
  redirect("/dashboard/soal?sukses=" + encodeURIComponent("Bank dihapus"));
}

export async function pindahkanSoal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const bankAsal = formData.get("bank_asal") as string;
  const bankTujuan = formData.get("bank_tujuan") as string;
  const listSoalId = formData.getAll("soal_id").map(String).filter(Boolean);

  if (listSoalId.length === 0) redirect(halamanBank(bankAsal, { error: "Centang soal yang ingin dipindahkan" }));
  if (!bankTujuan || bankTujuan === bankAsal) redirect(halamanBank(bankAsal, { error: "Pilih bank tujuan" }));

  // FK tidak memeriksa RLS, jadi bank tujuan dipastikan milik guru ini
  const { data: tujuan } = await supabase.from("bank_soal").select("id, nama").eq("id", bankTujuan).eq("guru_id", user.id).maybeSingle();
  if (!tujuan) redirect(halamanBank(bankAsal, { error: "Bank tujuan tidak ditemukan" }));

  const { error } = await supabase
    .from("soal")
    .update({ bank_soal_id: tujuan.id })
    .in("id", listSoalId)
    .eq("guru_id", user.id);

  if (error) redirect(halamanBank(bankAsal, { error: error.message }));

  revalidatePath("/dashboard/soal");
  redirect(halamanBank(bankAsal, { sukses: `${listSoalId.length} soal dipindahkan ke ${tujuan.nama}` }));
}
