"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Hanya kelas milik guru yang boleh jadi peserta ujian
async function saringKelasMilikGuru(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listKelasId: string[],
  guruId: string,
) {
  if (listKelasId.length === 0) return [];
  const { data: listKelas } = await supabase.from("kelas").select("id").in("id", listKelasId).eq("guru_id", guruId);
  return (listKelas ?? []).map((kelas) => kelas.id);
}

export async function createUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const judul = (formData.get("judul") as string)?.trim();
  const mapel = (formData.get("mapel") as string)?.trim() || null;
  const durasi = parseInt(formData.get("durasi") as string);
  const acakSoal = formData.get("acak_soal") === "true";
  const acakOpsi = formData.get("acak_opsi") === "true";
  const batasPelanggaran = parseInt(formData.get("batas_pelanggaran") as string) || 3;

  if (!judul) redirect("/dashboard/ujian/buat?error=" + encodeURIComponent("Judul wajib diisi"));
  if (!durasi || durasi < 1) redirect("/dashboard/ujian/buat?error=" + encodeURIComponent("Durasi minimal 1 menit"));

  const { data: ujian, error } = await supabase
    .from("ujian")
    .insert({
      guru_id: user.id,
      judul,
      mapel,
      durasi,
      acak_soal: acakSoal,
      acak_opsi: acakOpsi,
      batas_pelanggaran: batasPelanggaran,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) redirect("/dashboard/ujian/buat?error=" + encodeURIComponent(error.message));

  const kelasIds = await saringKelasMilikGuru(supabase, formData.getAll("kelas_ids[]") as string[], user.id);
  if (kelasIds.length > 0) {
    const kelasData = kelasIds.map((kelas_id) => ({ ujian_id: ujian.id, kelas_id }));
    await supabase.from("ujian_kelas").insert(kelasData);
  }

  revalidatePath("/dashboard/ujian");
  redirect(`/dashboard/ujian/${ujian.id}/soal`);
}

export async function updateUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const judul = (formData.get("judul") as string)?.trim();
  const mapel = (formData.get("mapel") as string)?.trim() || null;
  const durasi = parseInt(formData.get("durasi") as string);
  const acakSoal = formData.get("acak_soal") === "true";
  const acakOpsi = formData.get("acak_opsi") === "true";
  const batasPelanggaran = parseInt(formData.get("batas_pelanggaran") as string) || 3;

  if (!judul) redirect(`/dashboard/ujian/${id}/ubah?error=` + encodeURIComponent("Judul wajib diisi"));
  if (!durasi || durasi < 1) redirect(`/dashboard/ujian/${id}/ubah?error=` + encodeURIComponent("Durasi minimal 1 menit"));

  await pastikanUjianDraft(supabase, id, user.id);

  const { error } = await supabase
    .from("ujian")
    .update({
      judul,
      mapel,
      durasi,
      acak_soal: acakSoal,
      acak_opsi: acakOpsi,
      batas_pelanggaran: batasPelanggaran,
    })
    .eq("id", id)
    .eq("guru_id", user.id);

  if (error) redirect(`/dashboard/ujian/${id}/ubah?error=` + encodeURIComponent(error.message));

  await supabase.from("ujian_kelas").delete().eq("ujian_id", id);

  const kelasIds = await saringKelasMilikGuru(supabase, formData.getAll("kelas_ids[]") as string[], user.id);
  if (kelasIds.length > 0) {
    const kelasData = kelasIds.map((kelas_id) => ({ ujian_id: id, kelas_id }));
    await supabase.from("ujian_kelas").insert(kelasData);
  }

  revalidatePath("/dashboard/ujian");
  redirect(`/dashboard/ujian/${id}/soal`);
}

export async function deleteUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const { error } = await supabase.from("ujian").delete().eq("id", id).eq("guru_id", user.id);

  if (error) redirect("/dashboard/ujian?error=" + encodeURIComponent(error.message));

  revalidatePath("/dashboard/ujian");
  redirect("/dashboard/ujian");
}

// Soal ujian hanya boleh diubah oleh pemiliknya selama ujian masih draft
async function pastikanUjianDraft(supabase: Awaited<ReturnType<typeof createClient>>, ujianId: string, guruId: string) {
  const { data: ujian } = await supabase
    .from("ujian")
    .select("status")
    .eq("id", ujianId)
    .eq("guru_id", guruId)
    .single();

  if (!ujian) redirect("/dashboard/ujian");
  if (ujian.status !== "draft") {
    redirect(`/dashboard/ujian/${ujianId}/soal?error=` + encodeURIComponent("Soal hanya bisa diubah saat ujian masih draft"));
  }
}

export async function tambahSoalUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const soalIds = formData.getAll("soal_ids[]") as string[];

  await pastikanUjianDraft(supabase, ujianId, user.id);

  if (soalIds.length === 0) redirect(`/dashboard/ujian/${ujianId}/soal?error=` + encodeURIComponent("Pilih minimal 1 soal"));

  const { data: existing } = await supabase
    .from("ujian_soal")
    .select("urutan")
    .eq("ujian_id", ujianId)
    .order("urutan", { ascending: false })
    .limit(1)
    .single();

  let urutan = (existing?.urutan || 0) + 1;

  // Bobot awal diambil dari bank soal
  const { data: listSoalDipilih } = await supabase
    .from("soal")
    .select("id, bobot")
    .in("id", soalIds)
    .eq("guru_id", user.id);

  const bobotPerSoal = new Map((listSoalDipilih ?? []).map((soal) => [soal.id, soal.bobot]));

  // Soal milik guru lain diabaikan
  const soalIdMilikGuru = soalIds.filter((soal_id) => bobotPerSoal.has(soal_id));
  if (soalIdMilikGuru.length === 0) redirect(`/dashboard/ujian/${ujianId}/soal?error=` + encodeURIComponent("Soal tidak ditemukan"));

  const data = soalIdMilikGuru.map((soal_id) => ({
    ujian_id: ujianId,
    soal_id,
    urutan: urutan++,
    bobot: bobotPerSoal.get(soal_id) ?? 1,
  }));

  const { error } = await supabase.from("ujian_soal").insert(data);

  if (error) redirect(`/dashboard/ujian/${ujianId}/soal?error=` + encodeURIComponent(error.message));

  revalidatePath(`/dashboard/ujian/${ujianId}/soal`);
  redirect(`/dashboard/ujian/${ujianId}/soal`);
}

export async function hapusSoalUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const soalId = formData.get("soal_id") as string;

  await pastikanUjianDraft(supabase, ujianId, user.id);

  const { error } = await supabase.from("ujian_soal").delete().eq("ujian_id", ujianId).eq("soal_id", soalId);

  if (error) redirect(`/dashboard/ujian/${ujianId}/soal?error=` + encodeURIComponent(error.message));

  revalidatePath(`/dashboard/ujian/${ujianId}/soal`);
  redirect(`/dashboard/ujian/${ujianId}/soal`);
}

export async function generateKode(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const halamanSoal = `/dashboard/ujian/${ujianId}/soal`;

  await pastikanUjianDraft(supabase, ujianId, user.id);

  const [{ count: jumlahSoal }, { count: jumlahKelas }] = await Promise.all([
    supabase.from("ujian_soal").select("soal_id", { count: "exact", head: true }).eq("ujian_id", ujianId),
    supabase.from("ujian_kelas").select("kelas_id", { count: "exact", head: true }).eq("ujian_id", ujianId),
  ]);
  if (!jumlahSoal) redirect(halamanSoal + "?error=" + encodeURIComponent("Tambahkan minimal 1 soal sebelum membuka lobby"));
  if (!jumlahKelas) redirect(halamanSoal + "?error=" + encodeURIComponent("Pilih minimal 1 kelas peserta sebelum membuka lobby"));

  const { data: kode, error } = await supabase.rpc("generate_kode_ujian");

  if (error) redirect(`/dashboard/ujian/${ujianId}/soal?error=` + encodeURIComponent(error.message));

  const { error: updateError } = await supabase
    .from("ujian")
    .update({ kode, status: "lobby" })
    .eq("id", ujianId)
    .eq("guru_id", user.id);

  if (updateError) redirect(`/dashboard/ujian/${ujianId}/soal?error=` + encodeURIComponent(updateError.message));

  revalidatePath(`/dashboard/ujian/${ujianId}/soal`);
  redirect(`/dashboard/ujian/${ujianId}/lobby`);
}
