"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setujuiPeserta(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const pesertaId = formData.get("peserta_id") as string;
  const ujianId = formData.get("ujian_id") as string;
  const setujui = formData.get("setujui") === "true";

  const { error } = await supabase
    .from("peserta")
    .update({ disetujui: setujui })
    .eq("id", pesertaId);

  if (error) redirect(`/dashboard/ujian/${ujianId}/lobby?error=` + encodeURIComponent(error.message));

  revalidatePath(`/dashboard/ujian/${ujianId}/lobby`);
  redirect(`/dashboard/ujian/${ujianId}/lobby`);
}

export async function mulaiUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;

  const { data: ujian } = await supabase
    .from("ujian")
    .select("durasi")
    .eq("id", ujianId)
    .eq("guru_id", user.id)
    .single();

  if (!ujian) redirect("/dashboard/ujian");

  const mulaiAt = new Date();
  const selesaiAt = new Date(mulaiAt.getTime() + ujian.durasi * 60000);

  const { error } = await supabase
    .from("ujian")
    .update({
      status: "berjalan",
      mulai_at: mulaiAt.toISOString(),
      selesai_at: selesaiAt.toISOString(),
    })
    .eq("id", ujianId)
    .eq("guru_id", user.id);

  if (error) redirect(`/dashboard/ujian/${ujianId}/lobby?error=` + encodeURIComponent(error.message));

  await supabase
    .from("peserta")
    .update({ status: "mengerjakan", mulai_at: mulaiAt.toISOString(), selesai_at: selesaiAt.toISOString() })
    .eq("ujian_id", ujianId)
    .eq("disetujui", true);

  revalidatePath(`/dashboard/ujian/${ujianId}/lobby`);
  redirect(`/dashboard/ujian/${ujianId}/lobby`);
}

export async function akhiriUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;

  const { error } = await supabase
    .from("ujian")
    .update({ status: "selesai" })
    .eq("id", ujianId)
    .eq("guru_id", user.id);

  if (error) redirect(`/dashboard/ujian/${ujianId}/lobby?error=` + encodeURIComponent(error.message));

  await supabase
    .from("peserta")
    .update({ status: "selesai" })
    .eq("ujian_id", ujianId)
    .neq("status", "selesai");

  // Gagal hitung tidak menggagalkan "Akhiri"; guru bisa hitung ulang dari halaman nilai.
  await supabase.rpc("nilai_otomatis_ujian", { p_ujian_id: ujianId });

  revalidatePath(`/dashboard/ujian/${ujianId}/lobby`);
  redirect(`/dashboard/ujian/${ujianId}/nilai`);
}

export async function beriKodeBuka(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const pesertaId = formData.get("peserta_id") as string;
  const ujianId = formData.get("ujian_id") as string;

  const { data: peserta } = await supabase
    .from("peserta")
    .select("id, siswa:siswa_id (nama), ujian:ujian_id!inner (guru_id)")
    .eq("id", pesertaId)
    .eq("ujian_id", ujianId)
    .eq("ujian.guru_id", user.id)
    .single();

  if (!peserta) redirect(`/dashboard/ujian/${ujianId}/lobby?error=` + encodeURIComponent("Peserta tidak ditemukan"));

  const { data: kode, error: errorBuka } = await supabase.rpc("generate_kode_buka", { p_peserta_id: pesertaId });

  if (errorBuka) redirect(`/dashboard/ujian/${ujianId}/lobby?error=` + encodeURIComponent(errorBuka.message));

  const siswa = Array.isArray(peserta.siswa) ? peserta.siswa[0] : peserta.siswa;

  revalidatePath(`/dashboard/ujian/${ujianId}/lobby`);
  redirect(
    `/dashboard/ujian/${ujianId}/lobby?kode_buka=${encodeURIComponent(kode)}&nama=${encodeURIComponent(siswa?.nama ?? "")}`,
  );
}
