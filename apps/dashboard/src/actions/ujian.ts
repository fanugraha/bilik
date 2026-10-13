"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapelDariForm } from "@/lib/mapel";
import { NAMA_TIPE, urutkanTipe } from "@/lib/bagian-ujian";

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

// Langkah 1 wizard: buat draft dari info ujian. Aturan memakai bawaan, kelas dipilih di langkah 3.
export async function createUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const judul = (formData.get("judul") as string)?.trim();
  const { mapel_id } = await mapelDariForm(supabase, formData);
  const durasi = parseInt(formData.get("durasi") as string);
  const bankAsal = ((formData.get("bank") as string) ?? "").replace(/[^0-9a-f-]/gi, "");
  const halamanBuat = (pesan: string) =>
    `/dashboard/ujian/buat?${new URLSearchParams({ ...(bankAsal ? { bank: bankAsal } : {}), error: pesan }).toString()}`;

  if (!judul) redirect(halamanBuat("Judul wajib diisi"));
  if (!durasi || durasi < 1) redirect(halamanBuat("Durasi minimal 1 menit"));

  const { data: ujian, error } = await supabase
    .from("ujian")
    .insert({
      guru_id: user.id,
      judul,
      mapel_id,
      durasi,
      acak_soal: false,
      acak_opsi: false,
      batas_pelanggaran: 3,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !ujian) redirect(halamanBuat(error?.message ?? "Ujian gagal dibuat"));

  // Dibuat dari halaman bank: langkah soal langsung menampilkan bank itu
  revalidatePath("/dashboard/ujian");
  redirect(`/dashboard/ujian/${ujian.id}/soal${bankAsal ? `?bank=${bankAsal}` : ""}`);
}

// Langkah 1 wizard (ubah): hanya info, kelas & aturan tidak disentuh
export async function simpanInfoUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const judul = (formData.get("judul") as string)?.trim();
  const { mapel_id } = await mapelDariForm(supabase, formData);
  const durasi = parseInt(formData.get("durasi") as string);

  if (!judul) redirect(`/dashboard/ujian/${id}/ubah?error=` + encodeURIComponent("Judul wajib diisi"));
  if (!durasi || durasi < 1) redirect(`/dashboard/ujian/${id}/ubah?error=` + encodeURIComponent("Durasi minimal 1 menit"));

  await pastikanUjianDraft(supabase, id, user.id);

  const { error } = await supabase.from("ujian").update({ judul, mapel_id, durasi }).eq("id", id).eq("guru_id", user.id);

  if (error) redirect(`/dashboard/ujian/${id}/ubah?error=` + encodeURIComponent(error.message));

  revalidatePath("/dashboard/ujian");
  redirect(`/dashboard/ujian/${id}/soal`);
}

// Langkah 3 wizard: kelas peserta dan aturan pengawasan
export async function simpanPesertaUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const halamanPeserta = (pesan: string) => `/dashboard/ujian/${id}/peserta?error=` + encodeURIComponent(pesan);
  const acakSoal = formData.get("acak_soal") === "true";
  const acakOpsi = formData.get("acak_opsi") === "true";
  const batasPelanggaran = Math.min(20, Math.max(1, parseInt(formData.get("batas_pelanggaran") as string) || 3));

  await pastikanUjianDraft(supabase, id, user.id);

  const kelasIds = await saringKelasMilikGuru(supabase, formData.getAll("kelas_ids[]") as string[], user.id);
  if (kelasIds.length === 0) redirect(halamanPeserta("Pilih minimal satu kelas peserta"));

  const { error } = await supabase
    .from("ujian")
    .update({ acak_soal: acakSoal, acak_opsi: acakOpsi, batas_pelanggaran: batasPelanggaran })
    .eq("id", id)
    .eq("guru_id", user.id);
  if (error) redirect(halamanPeserta(error.message));

  await supabase.from("ujian_kelas").delete().eq("ujian_id", id);
  const { error: errorKelas } = await supabase.from("ujian_kelas").insert(kelasIds.map((kelas_id) => ({ ujian_id: id, kelas_id })));
  if (errorKelas) redirect(halamanPeserta(errorKelas.message));

  revalidatePath("/dashboard/ujian");
  redirect(`/dashboard/ujian/${id}/tinjau`);
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

function halamanSoalUjian(ujianId: string, pesan?: { error?: string; sukses?: string; bank?: string }) {
  const param = new URLSearchParams();
  // Bank yang sedang dipilih dipertahankan agar guru bisa mengambil lagi dari bank yang sama
  const bank = (pesan?.bank ?? "").replace(/[^0-9a-f-]/gi, "");
  if (bank) param.set("bank", bank);
  if (pesan?.error) param.set("error", pesan.error);
  if (pesan?.sukses) param.set("sukses", pesan.sukses);
  const teks = param.toString();
  return `/dashboard/ujian/${ujianId}/soal${teks ? `?${teks}` : ""}`;
}

type KlienSupabase = Awaited<ReturnType<typeof createClient>>;

// Masukkan soal ke bagian sesuai tipenya; bagian yang belum ada dibuat otomatis
// (urutan baku PG -> Benar/Salah -> Essay). Mengembalikan jumlah soal yang masuk.
async function masukkanSoalKeBagian(
  supabase: KlienSupabase,
  ujianId: string,
  listSoal: { id: string; tipe: string; bobot: number }[],
): Promise<{ jumlah: number; error?: string }> {
  const { data: sections } = await supabase.from("ujian_section").select("id, tipe, urutan").eq("ujian_id", ujianId);
  const daftarSection = sections ?? [];
  let urutanBagianTerakhir = daftarSection.reduce((maks, s) => Math.max(maks, s.urutan), 0);

  let jumlah = 0;
  for (const tipe of urutkanTipe(listSoal.map((soal) => soal.tipe))) {
    const soalTipe = listSoal.filter((soal) => soal.tipe === tipe);

    let section = daftarSection.find((s) => s.tipe === tipe);
    if (!section) {
      const { data: dibuat, error } = await supabase
        .from("ujian_section")
        .insert({ ujian_id: ujianId, urutan: ++urutanBagianTerakhir, judul: NAMA_TIPE[tipe], tipe })
        .select("id, tipe, urutan")
        .single();
      if (error || !dibuat) return { jumlah, error: error?.message ?? "Bagian gagal dibuat" };
      section = dibuat;
      daftarSection.push(dibuat);
    }

    const { data: terakhir } = await supabase
      .from("ujian_soal")
      .select("urutan")
      .eq("section_id", section.id)
      .order("urutan", { ascending: false })
      .limit(1)
      .maybeSingle();
    let urutan = (terakhir?.urutan ?? 0) + 1;

    const { error } = await supabase.from("ujian_soal").insert(
      soalTipe.map((soal) => ({ ujian_id: ujianId, section_id: section.id, soal_id: soal.id, urutan: urutan++, bobot: soal.bobot })),
    );
    if (error) return { jumlah, error: error.message };
    jumlah += soalTipe.length;
  }
  return { jumlah };
}

// Soal milik guru yang belum ada di ujian ini, dari daftar id atau dari bank + tipe
async function soalBaruUntukUjian(
  supabase: KlienSupabase,
  ujianId: string,
  guruId: string,
  saring: { soalIds?: string[]; bankId?: string; listTipe?: string[] },
) {
  const { data: sudahAda } = await supabase.from("ujian_soal").select("soal_id").eq("ujian_id", ujianId);
  const idSudahAda = new Set((sudahAda ?? []).map((baris) => baris.soal_id));

  let query = supabase.from("soal").select("id, tipe, bobot").eq("guru_id", guruId).order("created_at", { ascending: true });
  if (saring.soalIds) query = query.in("id", saring.soalIds);
  if (saring.bankId) query = query.eq("bank_soal_id", saring.bankId);
  if (saring.listTipe) query = query.in("tipe", saring.listTipe);
  const { data } = await query;

  return (data ?? []).filter((soal) => !idSudahAda.has(soal.id)).map((soal) => ({ ...soal, bobot: Number(soal.bobot) }));
}

// Cara utama: pilih bank lalu tipe; semua soal tipe itu dari bank masuk ke bagiannya
export async function ambilSoalPerTipe(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const bank = (formData.get("bank") as string) ?? "";
  const listTipe = urutkanTipe(formData.getAll("tipe").map(String));

  await pastikanUjianDraft(supabase, ujianId, user.id);
  if (!bank) redirect(halamanSoalUjian(ujianId, { error: "Pilih bank soal dulu" }));
  if (listTipe.length === 0) redirect(halamanSoalUjian(ujianId, { bank, error: "Centang minimal satu tipe soal" }));

  const listSoal = await soalBaruUntukUjian(supabase, ujianId, user.id, { bankId: bank, listTipe });
  if (listSoal.length === 0) redirect(halamanSoalUjian(ujianId, { bank, error: "Semua soal tipe itu dari bank ini sudah ada di ujian" }));

  const { jumlah, error } = await masukkanSoalKeBagian(supabase, ujianId, listSoal);
  if (error) redirect(halamanSoalUjian(ujianId, { bank, error }));

  revalidatePath(`/dashboard/ujian/${ujianId}/soal`);
  redirect(halamanSoalUjian(ujianId, { bank, sukses: `${jumlah} soal dimasukkan ke ujian` }));
}

// Cara tambahan: centang soal satu per satu; tiap soal tetap masuk ke bagian tipenya
export async function tambahSoalUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const bank = (formData.get("bank") as string) ?? "";
  const soalIds = formData.getAll("soal_ids[]").map(String).filter(Boolean);

  await pastikanUjianDraft(supabase, ujianId, user.id);
  if (soalIds.length === 0) redirect(halamanSoalUjian(ujianId, { bank, error: "Centang minimal 1 soal" }));

  const listSoal = await soalBaruUntukUjian(supabase, ujianId, user.id, { soalIds });
  if (listSoal.length === 0) redirect(halamanSoalUjian(ujianId, { bank, error: "Soal itu sudah ada di ujian ini" }));

  const { jumlah, error } = await masukkanSoalKeBagian(supabase, ujianId, listSoal);
  if (error) redirect(halamanSoalUjian(ujianId, { bank, error }));

  revalidatePath(`/dashboard/ujian/${ujianId}/soal`);
  redirect(halamanSoalUjian(ujianId, { bank, sukses: `${jumlah} soal ditambahkan` }));
}

// Bagian yang tidak punya soal lagi dihapus, agar siswa tidak melihat bagian kosong
async function hapusBagianKosong(supabase: KlienSupabase, ujianId: string) {
  const [{ data: sections }, { data: terpakai }] = await Promise.all([
    supabase.from("ujian_section").select("id").eq("ujian_id", ujianId),
    supabase.from("ujian_soal").select("section_id").eq("ujian_id", ujianId),
  ]);
  const idTerpakai = new Set((terpakai ?? []).map((baris) => baris.section_id));
  const idKosong = (sections ?? []).filter((s) => !idTerpakai.has(s.id)).map((s) => s.id);
  if (idKosong.length > 0) await supabase.from("ujian_section").delete().in("id", idKosong);
}

export async function hapusSoalUjian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const soalId = formData.get("soal_id") as string;
  const bank = (formData.get("bank") as string) ?? "";

  await pastikanUjianDraft(supabase, ujianId, user.id);

  const { error } = await supabase.from("ujian_soal").delete().eq("ujian_id", ujianId).eq("soal_id", soalId);
  if (error) redirect(halamanSoalUjian(ujianId, { bank, error: error.message }));
  await hapusBagianKosong(supabase, ujianId);

  revalidatePath(`/dashboard/ujian/${ujianId}/soal`);
  redirect(halamanSoalUjian(ujianId, { bank }));
}

// Keluarkan semua soal satu bagian sekaligus (bagian ikut terhapus; soal di bank tetap ada)
export async function kosongkanBagian(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const sectionId = formData.get("section_id") as string;
  const bank = (formData.get("bank") as string) ?? "";

  await pastikanUjianDraft(supabase, ujianId, user.id);

  const { error } = await supabase.from("ujian_section").delete().eq("id", sectionId).eq("ujian_id", ujianId);
  if (error) redirect(halamanSoalUjian(ujianId, { bank, error: error.message }));

  revalidatePath(`/dashboard/ujian/${ujianId}/soal`);
  redirect(halamanSoalUjian(ujianId, { bank, sukses: "Bagian dikosongkan" }));
}

export async function geserSection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const id = formData.get("id") as string;
  const arah = formData.get("arah") as string; // 'atas' | 'bawah'
  const bank = (formData.get("bank") as string) ?? "";

  await pastikanUjianDraft(supabase, ujianId, user.id);

  const { data: sections } = await supabase
    .from("ujian_section")
    .select("id, urutan")
    .eq("ujian_id", ujianId)
    .order("urutan", { ascending: true });

  const daftar = sections ?? [];
  const indeks = daftar.findIndex((s) => s.id === id);
  const target = arah === "atas" ? indeks - 1 : indeks + 1;
  if (indeks === -1 || target < 0 || target >= daftar.length) redirect(halamanSoalUjian(ujianId, { bank }));

  // Tukar urutan; pakai nilai sementara agar tidak bentrok unique(ujian_id, urutan)
  const a = daftar[indeks];
  const b = daftar[target];
  await supabase.from("ujian_section").update({ urutan: -1 }).eq("id", a.id);
  await supabase.from("ujian_section").update({ urutan: a.urutan }).eq("id", b.id);
  await supabase.from("ujian_section").update({ urutan: b.urutan }).eq("id", a.id);

  revalidatePath(`/dashboard/ujian/${ujianId}/soal`);
  redirect(halamanSoalUjian(ujianId, { bank }));
}

export async function generateKode(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const halamanTinjau = `/dashboard/ujian/${ujianId}/tinjau`;

  await pastikanUjianDraft(supabase, ujianId, user.id);

  const [{ count: jumlahSoal }, { count: jumlahKelas }] = await Promise.all([
    supabase.from("ujian_soal").select("soal_id", { count: "exact", head: true }).eq("ujian_id", ujianId),
    supabase.from("ujian_kelas").select("kelas_id", { count: "exact", head: true }).eq("ujian_id", ujianId),
  ]);
  if (!jumlahSoal) redirect(halamanTinjau + "?error=" + encodeURIComponent("Tambahkan minimal 1 soal sebelum membuka lobby"));
  if (!jumlahKelas) redirect(halamanTinjau + "?error=" + encodeURIComponent("Pilih minimal 1 kelas peserta sebelum membuka lobby"));

  const { data: kode, error } = await supabase.rpc("generate_kode_ujian");

  if (error) redirect(`${halamanTinjau}?error=` + encodeURIComponent(error.message));

  const { error: updateError } = await supabase
    .from("ujian")
    .update({ kode, status: "lobby" })
    .eq("id", ujianId)
    .eq("guru_id", user.id);

  if (updateError) redirect(`${halamanTinjau}?error=` + encodeURIComponent(updateError.message));

  revalidatePath(`/dashboard/ujian/${ujianId}/soal`);
  redirect(`/dashboard/ujian/${ujianId}/lobby`);
}
