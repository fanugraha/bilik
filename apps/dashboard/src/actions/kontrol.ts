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

  const { data: ujian } = await supabase
    .from("ujian")
    .select("status, selesai_at")
    .eq("id", ujianId)
    .eq("guru_id", user.id)
    .single();

  if (!ujian) redirect("/dashboard/ujian");

  const perubahan: Record<string, unknown> = { disetujui: setujui };
  // Murid yang telat masuk saat ujian sudah berjalan: setujui = langsung mulai.
  if (setujui && ujian.status === "berjalan") {
    perubahan.status = "mengerjakan";
    perubahan.mulai_at = new Date().toISOString();
    perubahan.selesai_at = ujian.selesai_at ?? new Date(Date.now() + 60 * 60000).toISOString();
  }

  const { error } = await supabase.from("peserta").update(perubahan).eq("id", pesertaId);

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

// Guru membuka kunci siswa langsung (tanpa kode buka). Dipakai bila kode bermasalah.
export async function bukaLangsung(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const pesertaId = formData.get("peserta_id") as string;
  const ujianId = formData.get("ujian_id") as string;
  const halamanLobby = `/dashboard/ujian/${ujianId}/lobby`;

  const peserta = await ambilPesertaMilikGuru(supabase, pesertaId, ujianId, user.id);
  if (!peserta) redirect(halamanLobby + "?error=" + encodeURIComponent("Peserta tidak ditemukan"));
  if (peserta.status !== "terkunci") {
    redirect(halamanLobby + "?error=" + encodeURIComponent("Siswa ini tidak sedang terkunci"));
  }

  const { error } = await supabase.from("peserta").update({ status: "mengerjakan" }).eq("id", pesertaId);
  if (error) redirect(halamanLobby + "?error=" + encodeURIComponent(error.message));

  // Kode buka yang belum dipakai dimatikan agar tidak menganggur
  await supabase.from("kode_buka").update({ dipakai: true }).eq("peserta_id", pesertaId).eq("dipakai", false);

  revalidatePath(halamanLobby);
  redirect(halamanLobby + "?sukses=" + encodeURIComponent("Kunci dibuka. Minta siswa lanjut mengerjakan."));
}

const BATAS_TAMBAH_WAKTU_MENIT = 120;

type PesertaMilikGuru = {
  id: string;
  status: string;
  selesai_at: string | null;
  tambahan_waktu: number;
  ujian: { status: string; selesai_at: string | null };
};

// Ambil peserta hanya jika ujiannya milik guru yang login
async function ambilPesertaMilikGuru(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pesertaId: string,
  ujianId: string,
  guruId: string,
): Promise<PesertaMilikGuru | null> {
  const { data: peserta } = await supabase
    .from("peserta")
    .select("id, status, selesai_at, tambahan_waktu, ujian:ujian_id!inner (guru_id, status, selesai_at)")
    .eq("id", pesertaId)
    .eq("ujian_id", ujianId)
    .eq("ujian.guru_id", guruId)
    .single();

  if (!peserta) return null;
  const ujian = Array.isArray(peserta.ujian) ? peserta.ujian[0] : peserta.ujian;
  return { ...peserta, ujian } as PesertaMilikGuru;
}

function tambahMenit(waktuIso: string, menit: number) {
  return new Date(new Date(waktuIso).getTime() + menit * 60000).toISOString();
}

export async function tolakPeserta(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const pesertaId = formData.get("peserta_id") as string;
  const ujianId = formData.get("ujian_id") as string;
  const halamanLobby = `/dashboard/ujian/${ujianId}/lobby`;

  const peserta = await ambilPesertaMilikGuru(supabase, pesertaId, ujianId, user.id);
  if (!peserta) redirect(halamanLobby + "?error=" + encodeURIComponent("Peserta tidak ditemukan"));

  if (peserta.ujian.status !== "lobby") {
    redirect(halamanLobby + "?error=" + encodeURIComponent("Siswa hanya bisa ditolak saat lobby"));
  }

  // Hapus baris peserta agar nama bisa dipilih lagi oleh siswa yang benar
  const { error } = await supabase.from("peserta").delete().eq("id", pesertaId);

  if (error) redirect(halamanLobby + "?error=" + encodeURIComponent(error.message));

  revalidatePath(halamanLobby);
  redirect(halamanLobby);
}

export async function resetPerangkat(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const pesertaId = formData.get("peserta_id") as string;
  const ujianId = formData.get("ujian_id") as string;
  const halamanLobby = `/dashboard/ujian/${ujianId}/lobby`;

  const peserta = await ambilPesertaMilikGuru(supabase, pesertaId, ujianId, user.id);
  if (!peserta) redirect(halamanLobby + "?error=" + encodeURIComponent("Peserta tidak ditemukan"));

  if (peserta.ujian.status !== "lobby" && peserta.ujian.status !== "berjalan") {
    redirect(halamanLobby + "?error=" + encodeURIComponent("Ujian sudah selesai"));
  }

  // Lepas perangkat lama: nama bisa dipilih lagi dari HP baru, jawaban tetap tersimpan.
  // Wajib disetujui ulang agar guru memastikan yang masuk adalah siswa yang benar.
  const { error } = await supabase
    .from("peserta")
    .update({ device_id: null, token_sesi: null, disetujui: false })
    .eq("id", pesertaId);

  if (error) redirect(halamanLobby + "?error=" + encodeURIComponent(error.message));

  revalidatePath(halamanLobby);
  redirect(halamanLobby);
}

export async function tambahWaktu(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const pesertaId = (formData.get("peserta_id") as string | null) || null;
  const menit = parseInt(formData.get("menit") as string);
  const halamanLobby = `/dashboard/ujian/${ujianId}/lobby`;

  if (!menit || menit < 1 || menit > BATAS_TAMBAH_WAKTU_MENIT) {
    redirect(halamanLobby + "?error=" + encodeURIComponent(`Tambahan waktu harus 1-${BATAS_TAMBAH_WAKTU_MENIT} menit`));
  }

  const { data: ujian } = await supabase
    .from("ujian")
    .select("status, selesai_at")
    .eq("id", ujianId)
    .eq("guru_id", user.id)
    .single();

  if (!ujian) redirect("/dashboard/ujian");
  if (ujian.status !== "berjalan" || !ujian.selesai_at) {
    redirect(halamanLobby + "?error=" + encodeURIComponent("Waktu hanya bisa ditambah saat ujian berjalan"));
  }

  // Per siswa
  if (pesertaId) {
    const peserta = await ambilPesertaMilikGuru(supabase, pesertaId, ujianId, user.id);
    if (!peserta) redirect(halamanLobby + "?error=" + encodeURIComponent("Peserta tidak ditemukan"));

    if (peserta.status !== "mengerjakan" && peserta.status !== "terkunci") {
      redirect(halamanLobby + "?error=" + encodeURIComponent("Siswa ini tidak sedang mengerjakan"));
    }

    const { error } = await supabase
      .from("peserta")
      .update({
        selesai_at: tambahMenit(peserta.selesai_at ?? ujian.selesai_at, menit),
        tambahan_waktu: peserta.tambahan_waktu + menit,
      })
      .eq("id", pesertaId);

    if (error) redirect(halamanLobby + "?error=" + encodeURIComponent(error.message));

    revalidatePath(halamanLobby);
    redirect(halamanLobby + "?sukses=" + encodeURIComponent(`Waktu ditambah ${menit} menit untuk 1 siswa`));
  }

  // Semua siswa yang masih mengerjakan
  const { error: errorUjian } = await supabase
    .from("ujian")
    .update({ selesai_at: tambahMenit(ujian.selesai_at, menit) })
    .eq("id", ujianId)
    .eq("guru_id", user.id);

  if (errorUjian) redirect(halamanLobby + "?error=" + encodeURIComponent(errorUjian.message));

  const { data: listPesertaAktif } = await supabase
    .from("peserta")
    .select("id, selesai_at, tambahan_waktu")
    .eq("ujian_id", ujianId)
    .in("status", ["mengerjakan", "terkunci"]);

  const hasilUpdate = await Promise.all(
    (listPesertaAktif ?? []).map((peserta) =>
      supabase
        .from("peserta")
        .update({
          selesai_at: tambahMenit(peserta.selesai_at ?? ujian.selesai_at, menit),
          tambahan_waktu: peserta.tambahan_waktu + menit,
        })
        .eq("id", peserta.id),
    ),
  );

  const updateGagal = hasilUpdate.find((hasil) => hasil.error);
  if (updateGagal?.error) redirect(halamanLobby + "?error=" + encodeURIComponent(updateGagal.error.message));

  revalidatePath(halamanLobby);
  redirect(
    halamanLobby +
      "?sukses=" +
      encodeURIComponent(`Waktu ditambah ${menit} menit untuk ${listPesertaAktif?.length ?? 0} siswa`),
  );
}

export async function setujuiSemuaPeserta(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const halamanLobby = `/dashboard/ujian/${ujianId}/lobby`;

  const { data: ujian } = await supabase.from("ujian").select("status").eq("id", ujianId).eq("guru_id", user.id).single();
  if (!ujian) redirect("/dashboard/ujian");
  if (ujian.status !== "lobby" && ujian.status !== "berjalan") {
    redirect(halamanLobby + "?error=" + encodeURIComponent("Ujian sudah selesai"));
  }

  const { data: listDisetujui, error } = await supabase
    .from("peserta")
    .update({ disetujui: true })
    .eq("ujian_id", ujianId)
    .eq("disetujui", false)
    .select("id");

  if (error) redirect(halamanLobby + "?error=" + encodeURIComponent(error.message));

  revalidatePath(halamanLobby);
  redirect(halamanLobby + "?sukses=" + encodeURIComponent(`${listDisetujui?.length ?? 0} siswa disetujui`));
}
