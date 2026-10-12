// Edge function "siswa": satu pintu masuk app siswa (PRD Fase 3).
//
// Siswa tidak punya akun/Supabase auth. Semua akses lewat fungsi ini memakai
// service role, diverifikasi dengan token_sesi acak. RLS tabel tetap guru-saja,
// jadi siswa tak pernah menyentuh tabel langsung dan kunci/pedoman tak terkirim.
//
// Aksi: join (kode -> daftar kelas+nama), pilih (buat peserta -> token),
// status (pantau persetujuan & mulai), soal (soal tanpa kunci),
// simpan (autosave jawaban), submit (akhiri pengerjaan).

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function balas(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalKode(v: unknown) {
  return String(v ?? "").trim().toUpperCase();
}

async function join(db: SupabaseClient, body: Record<string, unknown>) {
  const kode = normalKode(body.kode);
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

  const { data: terpakai } = await db
    .from("peserta")
    .select("siswa_id")
    .eq("ujian_id", ujian.id)
    .not("token_sesi", "is", null);
  const setTerpakai = new Set((terpakai ?? []).map((p) => p.siswa_id as string));

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

async function pilih(db: SupabaseClient, body: Record<string, unknown>) {
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
  if (ujian.status !== "lobby") return balas({ error: "Ujian sudah dimulai atau belum dibuka" }, 409);

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

async function status(db: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  if (!token) return balas({ error: "Sesi tidak valid" }, 400);

  const { data: peserta, error } = await db
    .from("peserta")
    .select("id, ujian_id, siswa_id, status, disetujui, jumlah_pelanggaran, tambahan_waktu, mulai_at, selesai_at")
    .eq("token_sesi", token)
    .maybeSingle();
  if (error) throw error;
  // Baris dihapus = siswa ditolak guru: app kembali ke pilih nama.
  if (!peserta) return balas({ ditolak: true });

  const { data: ujian } = await db
    .from("ujian")
    .select("id, judul, durasi, status, mulai_at, selesai_at, batas_pelanggaran")
    .eq("id", peserta.ujian_id)
    .single();

  return balas({ peserta, ujian });
}

async function pesertaDariToken(db: SupabaseClient, token: string) {
  const { data: peserta } = await db
    .from("peserta")
    .select("id, ujian_id, siswa_id, status, disetujui, selesai_at, tambahan_waktu, jumlah_pelanggaran")
    .eq("token_sesi", token)
    .maybeSingle();
  if (!peserta) return null;
  const { data: ujian } = await db
    .from("ujian")
    .select("id, judul, durasi, status, acak_soal, acak_opsi, batas_pelanggaran, selesai_at")
    .eq("id", peserta.ujian_id)
    .single();
  if (!ujian) return null;
  return { peserta, ujian };
}

// Kirim soal ujian tanpa kunci/pedoman/jawaban_benar (PRD 7).
async function soal(db: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const sesi = await pesertaDariToken(db, token);
  if (!sesi) return balas({ ditolak: true }, 404);
  if (sesi.peserta.status !== "mengerjakan" && sesi.peserta.status !== "terkunci") {
    return balas({ error: "Ujian belum dimulai" }, 409);
  }

  const { data: relasi, error } = await db
    .from("ujian_soal")
    .select("urutan, soal:soal_id(id, tipe, teks, opsi, bobot)")
    .eq("ujian_id", sesi.ujian.id)
    .order("urutan", { ascending: true });
  if (error) throw error;

  const daftar = (relasi ?? []).map((r) => {
    const s = Array.isArray(r.soal) ? r.soal[0] : r.soal;
    if (!s) return null;
    return { id: s.id, tipe: s.tipe, teks: s.teks, opsi: s.opsi ?? [], bobot: s.bobot };
  }).filter((s) => s !== null);

  const { data: jawaban } = await db
    .from("jawaban")
    .select("soal_id, isi, ragu_ragu")
    .eq("peserta_id", sesi.peserta.id);

  return balas({
    soal: daftar,
    jawaban: jawaban ?? [],
    peserta: {
      status: sesi.peserta.status,
      selesai_at: sesi.peserta.selesai_at,
      tambahan_waktu: sesi.peserta.tambahan_waktu,
      jumlah_pelanggaran: sesi.peserta.jumlah_pelanggaran,
    },
    ujian: {
      judul: sesi.ujian.judul,
      durasi: sesi.ujian.durasi,
      acak_soal: sesi.ujian.acak_soal,
      acak_opsi: sesi.ujian.acak_opsi,
      status: sesi.ujian.status,
      selesai_at: sesi.ujian.selesai_at,
    },
  });
}

async function simpan(db: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const soalId = String(body.soal_id ?? "");
  const isi = body.isi == null ? null : String(body.isi);
  const raguRagu = body.ragu_ragu === true;
  if (!soalId) return balas({ error: "Soal tidak valid" }, 400);

  const sesi = await pesertaDariToken(db, token);
  if (!sesi) return balas({ ditolak: true }, 404);
  if (sesi.peserta.status !== "mengerjakan") return balas({ error: "Ujian tidak sedang dikerjakan" }, 409);

  const { data: relasi } = await db
    .from("ujian_soal")
    .select("soal_id")
    .eq("ujian_id", sesi.ujian.id)
    .eq("soal_id", soalId)
    .maybeSingle();
  if (!relasi) return balas({ error: "Soal bukan bagian ujian ini" }, 400);

  const { error } = await db.from("jawaban").upsert(
    { peserta_id: sesi.peserta.id, soal_id: soalId, isi, ragu_ragu: raguRagu, diterima_at: new Date().toISOString() },
    { onConflict: "peserta_id,soal_id" },
  );
  if (error) throw error;
  return balas({ ok: true });
}

async function submit(db: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const sesi = await pesertaDariToken(db, token);
  if (!sesi) return balas({ ditolak: true }, 404);
  if (sesi.peserta.status === "selesai") return balas({ ok: true });
  if (sesi.peserta.status !== "mengerjakan" && sesi.peserta.status !== "terkunci") {
    return balas({ error: "Ujian belum dimulai" }, 409);
  }
  const { error } = await db
    .from("peserta")
    .update({ status: "selesai", selesai_at: new Date().toISOString() })
    .eq("id", sesi.peserta.id);
  if (error) throw error;
  return balas({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return balas({ error: "Metode tidak didukung" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return balas({ error: "Body tidak valid" }, 400);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    switch (body.aksi) {
      case "join":
        return await join(db, body);
      case "pilih":
        return await pilih(db, body);
      case "status":
        return await status(db, body);
      case "soal":
        return await soal(db, body);
      case "simpan":
        return await simpan(db, body);
      case "submit":
        return await submit(db, body);
      default:
        return balas({ error: "Aksi tidak dikenal" }, 400);
    }
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e);
    return balas({ error: pesan }, 500);
  }
});
