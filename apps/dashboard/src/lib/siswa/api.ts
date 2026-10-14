import { createClient } from "@/lib/supabase/client";

// Klien siswa versi web: satu pintu ke edge function `siswa`,
// sama seperti app mobile (tanpa akun; identitas pakai token sesi).

export type TipeSoal = "pg" | "benar_salah" | "angket" | "essay" | string;

export type Soal = { id: string; tipe: TipeSoal; teks: string; opsi: string[]; bobot: number };

export type Section = { id: string; urutan: number; judul: string | null; tipe: string; soal: Soal[] };

export type JawabanTersimpan = { soal_id: string; isi: string | null; alasan: string | null; ragu_ragu: boolean };

export type PesertaRingkas = {
  id: string;
  status: string;
  disetujui: boolean;
  jumlah_pelanggaran?: number;
  tambahan_waktu?: number;
  selesai_at?: string | null;
};

export type UjianRingkas = { judul: string; durasi: number; mapel?: string | null };

export type HasilSoal = {
  sections: Section[];
  jawaban: JawabanTersimpan[];
  peserta: {
    status: string;
    selesai_at: string | null;
    tambahan_waktu: number;
    jumlah_pelanggaran: number;
  };
  ujian: { judul: string; durasi: number; acak_soal: boolean; acak_opsi: boolean; status: string };
};

export type SiswaRingkas = { id: string; nama: string; no_absen: number | null; terpakai: boolean };
export type KelasJoin = { id: string; nama: string; siswa: SiswaRingkas[] };
export type JoinData = { ujian: UjianRingkas; kelas: KelasJoin[] };

export type HasilPilih = { token_sesi: string; peserta: PesertaRingkas; nama: string };

export type StatusSesi = { ditolak?: boolean; peserta?: PesertaRingkas; ujian?: { status: string; selesai_at: string | null } };

// Pesan error yang bisa dipahami siswa; pesan dari edge function diutamakan.
export function pesanGalatServer(status: number, detail: unknown): string {
  if (detail && typeof detail === "object" && "error" in detail) {
    const pesan = (detail as { error?: unknown }).error;
    if (pesan) return String(pesan);
  }
  if (typeof detail === "string" && detail.trim() && !detail.trim().startsWith("{")) return detail.trim();
  if (status === 404) return "Kode ujian tidak ditemukan. Periksa lagi kodenya ke guru.";
  if (status === 401 || status === 403) return "Permintaan tidak diizinkan server. Muat ulang halaman lalu coba lagi.";
  if (status === 429) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (status >= 500) return "Server sedang sibuk atau bermasalah. Coba lagi sebentar lagi.";
  return `Permintaan ditolak server (kode ${status}). Coba lagi atau beri tahu guru.`;
}

async function panggil<T>(aksi: string, body: Record<string, unknown> = {}): Promise<T> {
  const supabase = createClient();
  let hasil;
  try {
    hasil = await supabase.functions.invoke("siswa", { body: { aksi, ...body } });
  } catch {
    throw new Error("Gagal terhubung ke server. Periksa koneksi internet lalu coba lagi.");
  }

  if (hasil.error) {
    const konteks = (hasil.error as { context?: Response }).context;
    let detail: unknown = null;
    let status = 0;
    if (konteks && typeof konteks.json === "function") {
      status = konteks.status;
      try {
        detail = await konteks.json();
      } catch {
        detail = null;
      }
    }
    if (!konteks) throw new Error("Gagal terhubung ke server. Periksa koneksi internet lalu coba lagi.");
    throw new Error(pesanGalatServer(status, detail));
  }

  return hasil.data as T;
}

export async function join({ kode, deviceId }: { kode: string; deviceId: string }): Promise<JoinData> {
  return panggil<JoinData>("join", { kode, device_id: deviceId });
}

export async function pilih({
  kode,
  kelasId,
  siswaId,
  deviceId,
}: {
  kode: string;
  kelasId: string;
  siswaId: string;
  deviceId: string;
}): Promise<HasilPilih> {
  return panggil<HasilPilih>("pilih", { kode, kelas_id: kelasId, siswa_id: siswaId, device_id: deviceId });
}

export async function status(token: string): Promise<StatusSesi> {
  return panggil<StatusSesi>("status", { token });
}

export async function ambilSoal(token: string): Promise<HasilSoal> {
  return panggil<HasilSoal>("soal", { token });
}

export async function simpanJawaban({
  token,
  soalId,
  isi,
  alasan,
  raguRagu,
}: {
  token: string;
  soalId: string;
  isi: string | null;
  alasan: string | null;
  raguRagu: boolean;
}): Promise<void> {
  await panggil("simpan", { token, soal_id: soalId, isi, alasan, ragu_ragu: raguRagu });
}

export async function submit(token: string): Promise<void> {
  await panggil("submit", { token });
}

export async function lapor(token: string, jenis: string, keterangan?: string): Promise<{ jumlah: number; batas: number; terkunci: boolean }> {
  const d = await panggil<{ jumlah_pelanggaran?: number; batas?: number; terkunci?: boolean }>("lapor", { token, jenis, keterangan });
  return { jumlah: d.jumlah_pelanggaran ?? 0, batas: d.batas ?? 3, terkunci: d.terkunci === true };
}

export async function buka(token: string, kode: string): Promise<string> {
  const d = await panggil<{ status?: string }>("buka", { token, kode });
  return d.status ?? "mengerjakan";
}
