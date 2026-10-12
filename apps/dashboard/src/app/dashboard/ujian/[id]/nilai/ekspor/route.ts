import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ambilRekapNilai } from "@/lib/nilai";

// Pemisah ";" karena Excel dengan format regional Indonesia memakai koma untuk desimal.
const PEMISAH = ";";

function selCsv(nilai: string | number | null): string {
  let teks = "";
  if (typeof nilai === "number") teks = String(nilai).replace(".", ",");
  else if (nilai !== null) teks = nilai;
  // Cegah formula injection saat dibuka di Excel
  if (typeof nilai === "string" && /^[=+\-@\t\r]/.test(teks)) teks = "'" + teks;
  if (teks.includes(PEMISAH) || teks.includes('"') || teks.includes("\n")) {
    teks = '"' + teks.replace(/"/g, '""') + '"';
  }
  return teks;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: ujianId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const rekap = await ambilRekapNilai(supabase, ujianId, user.id);
  if (!rekap) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });

  const judulKolom = [
    "Kelas",
    "No Absen",
    "Nama",
    ...rekap.listSoal.map((soal, indeks) => `Soal ${indeks + 1}`),
    "Skor PG & B/S",
    "Skor Essay",
    "Essay Belum Dikoreksi",
    "Total Skor",
    "Skor Maksimal",
    "Nilai",
    "Pelanggaran",
  ];

  const listBarisCsv = [judulKolom.map(selCsv).join(PEMISAH)];

  for (const baris of rekap.listBaris) {
    const skorPerSoal = rekap.listSoal.map((soal) => {
      const jawaban = baris.listJawaban.find((item) => item.soalId === soal.soalId);
      if (!jawaban) return 0;
      return jawaban.skor;
    });

    const isiBaris = [
      baris.namaKelas,
      baris.noAbsen,
      baris.nama,
      ...skorPerSoal,
      baris.skorOtomatis,
      baris.skorEssay,
      baris.essayBelumDikoreksi,
      baris.totalSkor,
      rekap.skorMaksimal,
      baris.nilai,
      baris.jumlahPelanggaran,
    ];
    listBarisCsv.push(isiBaris.map(selCsv).join(PEMISAH));
  }

  // BOM agar Excel membaca UTF-8 dengan benar
  const isiCsv = "﻿" + listBarisCsv.join("\r\n");
  const namaFile = `nilai-${rekap.ujian.judul.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-") || "ujian"}.csv`;

  return new NextResponse(isiCsv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
