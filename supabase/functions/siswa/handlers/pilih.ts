import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { balas, normalKode } from "../lib/http.ts";

/** Daftarkan peserta (buat/pakai ulang baris) -> pulangkan token sesi. */
export async function pilih(db: SupabaseClient, body: Record<string, unknown>) {
  const kode = normalKode(body.kode);
  const kelasId = String(body.kelas_id ?? "");
  const siswaId = String(body.siswa_id ?? "");
  const deviceId = String(body.device_id ?? "").trim();
  if (!kelasId || !siswaId || !deviceId) return balas({ error: "Data tidak lengkap" }, 400);

  const { data: ujian, error } = await db
    .from("ujian")
    .select("id, judul, durasi, status")
    .eq("kode", kode)
    .maybeSingle();
  if (error) throw error;
  if (!ujian) return balas({ error: "Kode ujian tidak ditemukan" }, 404);

  const { data: relasi } = await db
    .from("ujian_kelas")
    .select("kelas_id")
    .eq("ujian_id", ujian.id)
    .eq("kelas_id", kelasId)
    .maybeSingle();
  if (!relasi) return balas({ error: "Kelas tidak ikut ujian ini" }, 400);

  const { data: siswa } = await db.from("siswa").select("id, nama, kelas_id").eq("id", siswaId).maybeSingle();
  if (!siswa || siswa.kelas_id !== kelasId) return balas({ error: "Siswa tidak ditemukan di kelas ini" }, 400);

  const { data: ada } = await db
    .from("peserta")
    .select("id, token_sesi, device_id, disetujui, status")
    .eq("ujian_id", ujian.id)
    .eq("siswa_id", siswaId)
    .maybeSingle();

  const ujianRingkas = { id: ujian.id, judul: ujian.judul, durasi: ujian.durasi };

  // Nama sudah terkunci ke satu perangkat: hanya boleh lanjut dari perangkat itu.
  if (ada?.token_sesi && ada?.device_id) {
    if (ada.device_id === deviceId) {
      return balas({
        token_sesi: ada.token_sesi,
        peserta: { id: ada.id, status: ada.status, disetujui: ada.disetujui },
        ujian: ujianRingkas,
        nama: siswa.nama,
      });
    }
    return balas({ error: "Nama ini sudah dipakai di perangkat lain. Minta guru mereset perangkat." }, 409);
  }

  // Peserta baru / setelah reset perangkat: boleh masuk saat ujian lobby atau berjalan.
  if (ujian.status !== "lobby" && ujian.status !== "berjalan") {
    return balas({ error: "Ujian belum dibuka atau sudah selesai" }, 409);
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  let pesertaId = ada?.id as string | undefined;

  if (ada) {
    // Baris lama (mis. setelah reset perangkat): pakai ulang, wajib disetujui lagi.
    const { error: errorUpdate } = await db
      .from("peserta")
      .update({ device_id: deviceId, token_sesi: token, disetujui: false, status: "menunggu" })
      .eq("id", ada.id);
    if (errorUpdate) throw errorUpdate;
  } else {
    const { data: ins, error: errorInsert } = await db
      .from("peserta")
      .insert({ ujian_id: ujian.id, siswa_id: siswaId, device_id: deviceId, token_sesi: token, disetujui: false, status: "menunggu" })
      .select("id")
      .single();
    if (errorInsert) throw errorInsert;
    pesertaId = ins.id;
  }

  return balas({
    token_sesi: token,
    peserta: { id: pesertaId, status: "menunggu", disetujui: false },
    ujian: ujianRingkas,
    nama: siswa.nama,
  });
}
