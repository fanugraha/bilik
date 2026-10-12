import Link from "next/link";
import { Tombol } from "@/components/ui/button";

type Kelas = { id: string; nama: string };

export type NilaiAwalUjian = {
  judul: string;
  mapel: string | null;
  durasi: number;
  batas_pelanggaran: number;
  acak_soal: boolean;
  acak_opsi: boolean;
  listKelasId: string[];
};

type IsianUjianProps = {
  listKelas: Kelas[];
  teksSimpan: string;
  hrefBatal: string;
  nilaiAwal?: NilaiAwalUjian;
};

const kelasInput =
  "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500";

// Isian form ujian, dipakai halaman Buat dan Ubah Ujian
export function IsianUjian({ listKelas, teksSimpan, hrefBatal, nilaiAwal }: IsianUjianProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judul Ujian</label>
          <input
            type="text"
            name="judul"
            placeholder="Contoh: UTS Matematika Kelas X"
            required
            defaultValue={nilaiAwal?.judul}
            className={kelasInput}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mapel (Opsional)</label>
          <input
            type="text"
            name="mapel"
            placeholder="Contoh: Matematika"
            defaultValue={nilaiAwal?.mapel ?? ""}
            className={kelasInput}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Durasi (menit)</label>
          <input
            type="number"
            name="durasi"
            placeholder="Contoh: 60"
            required
            min="1"
            defaultValue={nilaiAwal?.durasi ?? 60}
            className={kelasInput}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batas Pelanggaran</label>
          <input
            type="number"
            name="batas_pelanggaran"
            placeholder="Contoh: 3"
            min="1"
            defaultValue={nilaiAwal?.batas_pelanggaran ?? 3}
            className={kelasInput}
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="acak_soal" value="true" defaultChecked={nilaiAwal?.acak_soal} className="w-4 h-4" />
          <span className="text-sm font-medium text-gray-700">Acak urutan soal</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="acak_opsi" value="true" defaultChecked={nilaiAwal?.acak_opsi} className="w-4 h-4" />
          <span className="text-sm font-medium text-gray-700">Acak opsi jawaban (untuk soal PG)</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Kelas Peserta</label>
        {listKelas.length > 0 ? (
          <div className="space-y-2">
            {listKelas.map((kelas) => (
              <label key={kelas.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="kelas_ids[]"
                  value={kelas.id}
                  defaultChecked={nilaiAwal?.listKelasId.includes(kelas.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">{kelas.nama}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Belum ada kelas. Buat kelas terlebih dahulu.</p>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Link
          href={hrefBatal}
          className="flex-1 rounded-lg bg-gray-200 px-4 py-2.5 text-center font-medium text-gray-900 transition-colors hover:bg-gray-300"
        >
          Batal
        </Link>
        <Tombol teks={teksSimpan} jenis="utama" className="flex-1" />
      </div>
    </>
  );
}
