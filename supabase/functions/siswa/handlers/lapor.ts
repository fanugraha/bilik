import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { balas } from "../lib/http.ts";
import { pesertaDariToken } from "../lib/sesi.ts";

/** Catat pelanggaran (hitungan & penguncian ditangani trigger DB, PRD 6). */
export async function lapor(db: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const jenis = String(body.jenis ?? "").trim();
  const keterangan = body.keterangan == null ? null : String(body.keterangan);
  if (!jenis) return balas({ error: "Jenis pelanggaran tidak valid" }, 400);

  const sesi = await pesertaDariToken(db, token);
  if (!sesi) return balas({ ditolak: true }, 404);

  const { error: errorInsert } = await db
    .from("pelanggaran")
    .insert({ peserta_id: sesi.peserta.id, jenis, keterangan, waktu_server: new Date().toISOString() });
  if (errorInsert) throw errorInsert;

  const { data: peserta } = await db
    .from("peserta")
    .select("jumlah_pelanggaran, status")
    .eq("id", sesi.peserta.id)
    .single();

  return balas({
    ok: true,
    jumlah_pelanggaran: peserta?.jumlah_pelanggaran ?? sesi.peserta.jumlah_pelanggaran,
    batas: sesi.ujian.batas_pelanggaran ?? 3,
    terkunci: peserta?.status === "terkunci",
  });
}
