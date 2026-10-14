// Penyimpanan sesi siswa di localStorage. Cerminan SessionStore di app mobile:
// tahan refresh sehingga siswa bisa melanjutkan tanpa memasukkan kode lagi.

const K = {
  pesertaId: "bilik_peserta_id",
  token: "bilik_token_sesi",
  kode: "bilik_kode_ujian",
  device: "bilik_device_id",
  jawaban: "bilik_answers_cache",
  draft: "bilik_draft_join",
};

export type Sesi = { pesertaId: string | null; token: string | null; kode: string | null };
export type Draft = { kode: string; kelasId: string; kelasNama: string; siswaId: string; siswaNama: string; ujianJudul: string };

function baca(kunci: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(kunci);
}

// ID perangkat tetap: satu nama dikunci ke satu perangkat (PRD 5.2/6).
export function deviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(K.device);
  if (!id) {
    const acak = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    id = `${Date.now()}-${acak.replace(/-/g, "")}`;
    window.localStorage.setItem(K.device, id);
  }
  return id;
}

export function simpanSesi(sesi: { pesertaId: string; token: string; kode: string }) {
  window.localStorage.setItem(K.pesertaId, sesi.pesertaId);
  window.localStorage.setItem(K.token, sesi.token);
  window.localStorage.setItem(K.kode, sesi.kode);
}

export function ambilSesi(): Sesi {
  return { pesertaId: baca(K.pesertaId), token: baca(K.token), kode: baca(K.kode) };
}

export function ambilPesertaId(): string | null {
  return baca(K.pesertaId);
}

export function simpanDraft(draft: Draft) {
  window.localStorage.setItem(K.draft, JSON.stringify(draft));
}

export function ambilDraft(): Draft | null {
  const raw = baca(K.draft);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

export function cacheJawaban(soalId: string, data: { isi: string | null; alasan: string | null; ragu: boolean }) {
  if (typeof window === "undefined") return;
  let map: Record<string, unknown> = {};
  try {
    map = JSON.parse(window.localStorage.getItem(K.jawaban) ?? "{}") as Record<string, unknown>;
  } catch {
    map = {};
  }
  map[soalId] = data;
  window.localStorage.setItem(K.jawaban, JSON.stringify(map));
}

export function bersihkan() {
  if (typeof window === "undefined") return;
  [K.pesertaId, K.token, K.kode, K.jawaban, K.draft].forEach((kunci) => window.localStorage.removeItem(kunci));
}
