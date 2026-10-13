import Link from "next/link";
import { Tombol } from "@/components/ui/button";
import { TautanTombol } from "@/components/ui/tautan-tombol";
import { PilihMapel } from "@/components/ui/pilih-mapel";
import type { MapelRingkas } from "@/lib/mapel";

type Kelas = { id: string; nama: string };

export type NilaiAwalUjian = {
  judul: string;
  mapel_id: string | null;
  durasi: number;
  batas_pelanggaran: number;
  acak_soal: boolean;
  acak_opsi: boolean;
  listKelasId: string[];
};

type IsianUjianProps = {
  listKelas: Kelas[];
  daftarMapel: MapelRingkas[];
  teksSimpan: string;
  hrefBatal: string;
  nilaiAwal?: NilaiAwalUjian;
  // Mapel bawaan untuk ujian baru, mis. dari bank soal asal
  mapelIdAwal?: string | null;
};

function JudulBagian({ judul, deskripsi }: { judul: string; deskripsi?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-tinta">{judul}</h3>
      {deskripsi && <p className="text-xs text-tinta-2">{deskripsi}</p>}
    </div>
  );
}

// Isian form ujian, dipakai halaman Buat dan Ubah Ujian
export function IsianUjian({ listKelas, daftarMapel, teksSimpan, hrefBatal, nilaiAwal, mapelIdAwal }: IsianUjianProps) {
  return (
    <div className="divide-y divide-garis">
      <section className="pb-6">
        <JudulBagian judul="Informasi ujian" />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="judul" className="text-sm font-medium text-tinta">
              Judul
            </label>
            <input id="judul" type="text" name="judul" required defaultValue={nilaiAwal?.judul} placeholder="Contoh: PTS Matematika Semester 1" className="bidang" />
          </div>
          <PilihMapel daftar={daftarMapel} terpilih={nilaiAwal?.mapel_id ?? mapelIdAwal} label="Mapel (opsional)" />
        </div>
      </section>

      <section className="py-6">
        <JudulBagian judul="Kelas peserta" deskripsi="Siswa dari kelas yang dipilih bisa masuk ke lobby ujian ini." />
        {listKelas.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {listKelas.map((kelas) => (
              <label
                key={kelas.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-garis-tegas px-3 py-2 text-sm font-medium text-tinta has-[:checked]:border-nila has-[:checked]:bg-nila-muda has-[:checked]:text-nila has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-nila"
              >
                <input
                  type="checkbox"
                  name="kelas_ids[]"
                  value={kelas.id}
                  defaultChecked={nilaiAwal?.listKelasId.includes(kelas.id)}
                  className="h-4 w-4 accent-[var(--color-nila)]"
                />
                {kelas.nama}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-tinta-2">
            Belum ada kelas.{" "}
            <Link href="/dashboard/kelas" className="font-semibold text-nila hover:text-nila-tua">
              Buat kelas dulu
            </Link>
            .
          </p>
        )}
      </section>

      <section className="py-6">
        <JudulBagian judul="Waktu dan pengawasan" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="durasi" className="text-sm font-medium text-tinta">
              Durasi (menit)
            </label>
            <input id="durasi" type="number" name="durasi" required min="1" max="600" defaultValue={nilaiAwal?.durasi ?? 60} className="bidang angka" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="batas_pelanggaran" className="text-sm font-medium text-tinta">
              Batas pelanggaran
            </label>
            <input
              id="batas_pelanggaran"
              type="number"
              name="batas_pelanggaran"
              min="1"
              max="20"
              defaultValue={nilaiAwal?.batas_pelanggaran ?? 3}
              aria-describedby="batas-bantuan"
              className="bidang angka"
            />
            <p id="batas-bantuan" className="text-xs text-tinta-2">
              HP siswa terkunci setelah pindah aplikasi sebanyak ini.
            </p>
          </div>
        </div>
      </section>

      <section className="py-6">
        <JudulBagian judul="Pengacakan" deskripsi="Mengurangi contek antar siswa yang duduk berdekatan." />
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="acak_soal" value="true" defaultChecked={nilaiAwal?.acak_soal} className="mt-0.5 h-4 w-4 accent-[var(--color-nila)]" />
            <span>
              <span className="block text-sm font-medium text-tinta">Acak urutan soal</span>
              <span className="block text-xs text-tinta-2">Setiap siswa mendapat urutan soal berbeda.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="acak_opsi" value="true" defaultChecked={nilaiAwal?.acak_opsi} className="mt-0.5 h-4 w-4 accent-[var(--color-nila)]" />
            <span>
              <span className="block text-sm font-medium text-tinta">Acak pilihan jawaban</span>
              <span className="block text-xs text-tinta-2">Berlaku untuk soal pilihan ganda.</span>
            </span>
          </label>
        </div>
      </section>

      <div className="flex justify-end gap-2 pt-5">
        <TautanTombol href={hrefBatal} teks="Batal" jenis="hantu" />
        <Tombol teks={teksSimpan} teksProses="Menyimpan..." />
      </div>
    </div>
  );
}
