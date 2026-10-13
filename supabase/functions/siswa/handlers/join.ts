import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { balas, normalKode } from "../lib/http.ts";

/** Cek kode ujian -> daftar kelas + nama (tandai nama terpakai perangkat lain). */
export async function join(db: SupabaseClient, body: Record<string, unknown>) {
  const kode = normalKode(body.kode);
  const deviceId = String(body.device_id ?? "").trim();
  if (kode.length < 4) return balas({ error: "Kode ujian tidak valid" }, 400);

  const { data: ujian, error } = await db
    .from("ujian")
    .select("id, judul, mapel, durasi, status")
    .eq("kode", kode)
    .maybeSingle();
  if (error) throw error;
  if (!ujian) return balas({ error: "Kode ujian tidak ditemukan" }, 404);
  if (ujian.status !== "lobby" && ujian.status !== "berjalan") {
    return balas({ error: "Ujian belum dibuka atau sudah selesai" }, 409);
  }

  const { data: relasi, error: errorRelasi } = await db
    .from("ujian_kelas")
    .select("kelas_id, kelas:kelas_id(id, nama)")
    .eq("ujian_id", ujian.id);
  if (errorRelasi) throw errorRelasi;

  const kelasIds = (relasi ?? []).map((r) => r.kelas_id as string);
  let listSiswa: { id: string; kelas_id: string; nama: string; no_absen: number | null }[] = [];
  if (kelasIds.length > 0) {
    const { data, error: errorSiswa } = await db
      .from("siswa")
      .select("id, kelas_id, nama, no_absen")
      .in("kelas_id", kelasIds)
      .order("no_absen", { ascending: true });
    if (errorSiswa) throw errorSiswa;
    listSiswa = data ?? [];
  }

  // Nama dianggap terpakai hanya bila tokennya milik PERANGKAT LAIN.
  // Perangkat yang sama boleh memilih namanya lagi (melanjutkan sesi).
  const { data: terpakai } = await db
    .from("peserta")
    .select("siswa_id, device_id")
    .eq("ujian_id", ujian.id)
    .not("token_sesi", "is", null);
  const setTerpakai = new Set(
    (terpakai ?? [])
      .filter((p) => !(deviceId !== "" && p.device_id === deviceId))
      .map((p) => p.siswa_id as string),
  );

  const kelas = (relasi ?? []).map((r) => {
    const k = Array.isArray(r.kelas) ? r.kelas[0] : r.kelas;
    return {
      id: r.kelas_id as string,
      nama: (k?.nama as string) ?? "Kelas",
      siswa: listSiswa
        .filter((s) => s.kelas_id === r.kelas_id)
        .map((s) => ({ id: s.id, nama: s.nama, no_absen: s.no_absen, terpakai: setTerpakai.has(s.id) })),
    };
  });

  return balas({
    ujian: { id: ujian.id, judul: ujian.judul, mapel: ujian.mapel, durasi: ujian.durasi },
    kelas,
  });
}
