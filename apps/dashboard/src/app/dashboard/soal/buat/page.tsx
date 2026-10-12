import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSoal } from "@/actions/soal";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { KotakInput } from "@/components/ui/input";
import { Pesan } from "@/components/ui/alert";

const kelasSelect =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500";

async function FormBuatSoal({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: errorQuery } = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}
      <Kartu>
        <form action={createSoal} className="flex flex-col gap-6">
          <input type="hidden" name="guru_id" value={user.id} />

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Informasi Dasar
            </legend>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tipe" className="text-sm font-medium text-gray-700">
                Tipe Soal
              </label>
              <select id="tipe" name="tipe" required className={kelasSelect}>
                <option value="pg">Pilihan Ganda (PG)</option>
                <option value="essay">Essay</option>
                <option value="benar_salah">Benar / Salah</option>
              </select>
            </div>
            <KotakInput
              nama="teks"
              label="Teks Soal"
              tipe="text"
              wajib={true}
              placeholder="Tulis pertanyaan atau pernyataan di sini"
            />
            <KotakInput
              nama="bobot"
              label="Bobot Nilai"
              tipe="text"
              wajib={true}
              placeholder="1"
            />
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Opsi Jawaban (PG)
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {"ABCDE".split("").map((h) => (
                <KotakInput
                  key={h}
                  nama={`opsi_${h}`}
                  label={`Opsi ${h}`}
                  placeholder={`Isi pilihan ${h}`}
                />
              ))}
            </div>
            <KotakInput
              nama="kunci"
              label="Kunci Jawaban (A–E)"
              placeholder="Contoh: A"
            />
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Benar / Salah
            </legend>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="jawaban_benar"
                className="text-sm font-medium text-gray-700"
              >
                Jawaban Benar
              </label>
              <select
                id="jawaban_benar"
                name="jawaban_benar"
                className={kelasSelect}
                defaultValue="true"
              >
                <option value="true">Benar</option>
                <option value="false">Salah</option>
              </select>
            </div>
            <KotakInput
              nama="penjelasan"
              label="Penjelasan (alasannya)"
              placeholder="Jelaskan mengapa jawaban itu benar/salah"
            />
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Essay
            </legend>
            <KotakInput
              nama="pedoman"
              label="Pedoman Penilaian (opsional)"
              placeholder="Kata kunci atau kriteria jawaban"
            />
          </fieldset>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <a href="/dashboard/soal">
              <Tombol teks="Batal" jenis="kedua" className="w-auto" />
            </a>
            <Tombol teks="Simpan Soal" jenis="utama" className="w-auto" />
          </div>
        </form>
      </Kartu>
    </div>
  );
}

export default function BuatSoalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mx-auto mb-4 flex max-w-2xl items-center justify-between sm:mb-6">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Buat Soal</h1>
        <a href="/dashboard/soal" className="text-sm text-indigo-600 hover:underline">
          ← Kembali
        </a>
      </div>
      <Suspense fallback={<p className="text-gray-500">Memuat…</p>}>
        <FormBuatSoal searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
