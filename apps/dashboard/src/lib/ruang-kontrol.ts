// Agregasi data ruang kontrol (dipisah dari komponen halaman).

export type ItemRingkasan = { teks: string; jumlah: number; dari?: number; warna: string };

export type StatusPesertaRingkas = { status: string; disetujui: boolean };

export type RingkasanPeserta = {
  jumlahMenungguPersetujuan: number;
  jumlahDisetujui: number;
  jumlahPerStatus: Map<string, number>;
};

/** Hitung ringkasan setujui/status dari daftar peserta. */
export function hitungStatusPeserta(listPeserta: StatusPesertaRingkas[]): RingkasanPeserta {
  let jumlahMenungguPersetujuan = 0;
  let jumlahDisetujui = 0;
  const jumlahPerStatus = new Map<string, number>();
  for (const peserta of listPeserta) {
    if (peserta.disetujui) jumlahDisetujui++;
    else jumlahMenungguPersetujuan++;
    jumlahPerStatus.set(peserta.status, (jumlahPerStatus.get(peserta.status) ?? 0) + 1);
  }
  return { jumlahMenungguPersetujuan, jumlahDisetujui, jumlahPerStatus };
}

/** Hitung jumlah soal terjawab per peserta dari daftar jawaban terisi. */
export function hitungTerjawabPerPeserta(listJawaban: { peserta_id: string }[]): Map<string, number> {
  const peta = new Map<string, number>();
  for (const jawaban of listJawaban) {
    peta.set(jawaban.peserta_id, (peta.get(jawaban.peserta_id) ?? 0) + 1);
  }
  return peta;
}

type OpsiRingkasan = {
  statusUjian: string;
  jumlahPeserta: number;
  jumlahSiswaTerdaftar: number;
  jumlahSoal: number;
  ringkasan: RingkasanPeserta;
};

/** Susun 4 kartu ringkasan di kepala ruang kontrol. */
export function ringkasanStatusUjian(opts: OpsiRingkasan): ItemRingkasan[] {
  const { statusUjian, jumlahPeserta, jumlahSiswaTerdaftar, jumlahSoal, ringkasan } = opts;
  if (statusUjian === "lobby") {
    return [
      { teks: "Sudah masuk", jumlah: jumlahPeserta, dari: jumlahSiswaTerdaftar, warna: "text-tinta" },
      { teks: "Menunggu persetujuan", jumlah: ringkasan.jumlahMenungguPersetujuan, warna: "text-biru" },
      { teks: "Disetujui", jumlah: ringkasan.jumlahDisetujui, warna: "text-hijau" },
      { teks: "Soal", jumlah: jumlahSoal, warna: "text-tinta" },
    ];
  }
  return [
    { teks: "Mengerjakan", jumlah: ringkasan.jumlahPerStatus.get("mengerjakan") ?? 0, warna: "text-hijau" },
    { teks: "Terkunci", jumlah: ringkasan.jumlahPerStatus.get("terkunci") ?? 0, warna: "text-merah" },
    { teks: "Selesai", jumlah: ringkasan.jumlahPerStatus.get("selesai") ?? 0, warna: "text-tinta-2" },
    { teks: "Belum disetujui", jumlah: ringkasan.jumlahMenungguPersetujuan, warna: "text-biru" },
  ];
}
