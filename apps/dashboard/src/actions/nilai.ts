"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ambilRekapNilai } from "@/lib/nilai";

export async function hitungNilaiOtomatis(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;

  const { error } = await supabase.rpc("nilai_otomatis_ujian", { p_ujian_id: ujianId });

  if (error) redirect(`/dashboard/ujian/${ujianId}/nilai?error=` + encodeURIComponent(error.message));

  revalidatePath(`/dashboard/ujian/${ujianId}/nilai`);
  redirect(`/dashboard/ujian/${ujianId}/nilai?sukses=` + encodeURIComponent("Nilai otomatis (PG, Benar/Salah, Angket) sudah dihitung ulang"));
}

export async function simpanSkorManual(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const pesertaId = formData.get("peserta_id") as string;
  const halamanKoreksi = `/dashboard/ujian/${ujianId}/nilai/${pesertaId}`;

  const rekap = await ambilRekapNilai(supabase, ujianId, user.id);
  if (!rekap) redirect("/dashboard/ujian");

  if (rekap.ujian.status !== "selesai" && rekap.ujian.status !== "dinilai") {
    redirect(halamanKoreksi + "?error=" + encodeURIComponent("Ujian belum selesai"));
  }

  const peserta = rekap.listBaris.find((baris) => baris.pesertaId === pesertaId);
  if (!peserta) redirect(`/dashboard/ujian/${ujianId}/nilai`);

  for (const soal of rekap.listSoal) {
    if (soal.tipe === "pg") continue;

    const sudahDijawab = peserta.listJawaban.some((jawaban) => jawaban.soalId === soal.soalId);
    if (!sudahDijawab) continue;

    const isianSkor = (formData.get(`skor_${soal.soalId}`) as string | null)?.trim() ?? "";
    let skor: number | null = null;

    if (isianSkor !== "") {
      skor = Number(isianSkor);
      if (Number.isNaN(skor) || skor < 0 || skor > soal.bobot) {
        redirect(
          halamanKoreksi +
            "?error=" +
            encodeURIComponent(`Skor soal no. ${soal.urutan} harus antara 0 dan ${soal.bobot}`),
        );
      }
    }

    const { error } = await supabase
      .from("jawaban")
      .update({ skor })
      .eq("peserta_id", pesertaId)
      .eq("soal_id", soal.soalId);

    if (error) redirect(halamanKoreksi + "?error=" + encodeURIComponent(error.message));
  }

  revalidatePath(`/dashboard/ujian/${ujianId}/nilai`);

  // Tombol navigasi menyimpan dulu baru pindah, agar skor yang diketik tidak hilang.
  const adaPeserta = (id: string) => rekap.listBaris.some((baris) => baris.pesertaId === id);
  const pesertaBerikutnya = formData.get("lanjut_ke") as string | null;
  if (pesertaBerikutnya && adaPeserta(pesertaBerikutnya)) {
    redirect(`/dashboard/ujian/${ujianId}/nilai/${pesertaBerikutnya}?sukses=` + encodeURIComponent(`Skor ${peserta.nama} tersimpan`));
  }

  const pesertaSebelumnya = formData.get("kembali_ke") as string | null;
  if (pesertaSebelumnya && adaPeserta(pesertaSebelumnya)) {
    redirect(`/dashboard/ujian/${ujianId}/nilai/${pesertaSebelumnya}?sukses=` + encodeURIComponent(`Skor ${peserta.nama} tersimpan`));
  }

  redirect(halamanKoreksi + "?sukses=" + encodeURIComponent("Skor tersimpan"));
}

export async function tandaiDinilai(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ujianId = formData.get("ujian_id") as string;
  const halamanNilai = `/dashboard/ujian/${ujianId}/nilai`;

  const rekap = await ambilRekapNilai(supabase, ujianId, user.id);
  if (!rekap) redirect("/dashboard/ujian");

  if (rekap.ujian.status !== "selesai") {
    redirect(halamanNilai + "?error=" + encodeURIComponent("Hanya ujian berstatus selesai yang bisa ditandai dinilai"));
  }

  let jumlahBelumDinilai = 0;
  for (const baris of rekap.listBaris) jumlahBelumDinilai += baris.belumDinilai;

  if (jumlahBelumDinilai > 0) {
    redirect(
      halamanNilai +
        "?error=" +
        encodeURIComponent(`Masih ada ${jumlahBelumDinilai} jawaban yang belum dinilai`),
    );
  }

  const { error } = await supabase
    .from("ujian")
    .update({ status: "dinilai" })
    .eq("id", ujianId)
    .eq("guru_id", user.id);

  if (error) redirect(halamanNilai + "?error=" + encodeURIComponent(error.message));

  revalidatePath("/dashboard/ujian");
  revalidatePath(halamanNilai);
  redirect(halamanNilai + "?sukses=" + encodeURIComponent("Ujian ditandai sudah dinilai"));
}
