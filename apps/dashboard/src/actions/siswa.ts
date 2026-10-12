"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bacaDataImpor } from "@/lib/impor-siswa";

// Kode 23505 = melanggar unique (kelas_id, no_absen)
function pesanErrorSiswa(error: { code?: string; message: string }) {
  if (error.code === "23505") return "No absen sudah dipakai siswa lain di kelas ini";
  return error.message;
}

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
    redirect(`/dashboard/kelas/${kelasId}/siswa?error=${encodeURIComponent(pesanErrorSiswa(error))}`);
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
    redirect(`/dashboard/kelas/${kelasId}/siswa?error=${encodeURIComponent(pesanErrorSiswa(error))}`);
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

const UKURAN_DATA_IMPOR_MAKS = 50_000;

export async function imporSiswa(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const kelasId = formData.get("kelas_id") as string;
  const teksImpor = (formData.get("data_impor") as string | null) ?? "";
  const halamanSiswa = `/dashboard/kelas/${kelasId}/siswa`;

  const { data: kelas } = await supabase.from("kelas").select("id").eq("id", kelasId).eq("guru_id", user.id).single();
  if (!kelas) redirect("/dashboard/kelas");

  if (teksImpor.length > UKURAN_DATA_IMPOR_MAKS) {
    redirect(halamanSiswa + "?error=" + encodeURIComponent("Data impor terlalu besar"));
  }

  const { data: listSiswaAda } = await supabase.from("siswa").select("no_absen, nama").eq("kelas_id", kelasId);

  // Baca ulang di server; hasil pratinjau dari browser tidak dipercaya
  const { listBaris, pesanUmum } = bacaDataImpor(teksImpor, listSiswaAda ?? []);
  if (pesanUmum) redirect(halamanSiswa + "?error=" + encodeURIComponent(pesanUmum));

  const listBaru = listBaris.filter((baris) => baris.status === "baru");
  const listPerbarui = listBaris.filter((baris) => baris.status === "perbarui");
  const jumlahDilewati = listBaris.length - listBaru.length - listPerbarui.length;

  if (listBaru.length === 0 && listPerbarui.length === 0) {
    redirect(halamanSiswa + "?error=" + encodeURIComponent("Tidak ada siswa baru atau nama yang berubah"));
  }

  if (listBaru.length > 0) {
    const { error } = await supabase
      .from("siswa")
      .insert(listBaru.map((baris) => ({ kelas_id: kelasId, nama: baris.nama, no_absen: baris.noAbsen })));
    if (error) redirect(halamanSiswa + "?error=" + encodeURIComponent(pesanErrorSiswa(error)));
  }

  for (const baris of listPerbarui) {
    const { error } = await supabase
      .from("siswa")
      .update({ nama: baris.nama })
      .eq("kelas_id", kelasId)
      .eq("no_absen", baris.noAbsen as number);
    if (error) redirect(halamanSiswa + "?error=" + encodeURIComponent(error.message));
  }

  revalidatePath(halamanSiswa);
  redirect(
    halamanSiswa +
      "?sukses=" +
      encodeURIComponent(
        `Impor selesai: ${listBaru.length} ditambah, ${listPerbarui.length} diperbarui, ${jumlahDilewati} dilewati`,
      ),
  );
}
