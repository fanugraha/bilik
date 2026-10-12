import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateSoal } from "@/actions/soal";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { KotakInput } from "@/components/ui/input";
import { Pesan } from "@/components/ui/alert";

async function FormUbahSoal({
  id,
  searchParams,
}: {
  id: string;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: soal } = await supabase
    .from("soal")
    .select("tipe, teks, opsi, kunci, pedoman, bobot, jawaban_benar, penjelasan")
    .eq("id", id)
    .eq("guru_id", user.id)
    .single();

  if (!soal) redirect("/dashboard/soal");

  const { error: errorQuery } = await searchParams;

  const opsiList = (soal.opsi || []) as string[];

  return (
    <div className="flex flex-col gap-6">
      {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}
      <Kartu>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Ubah Soal</h2>
        <form action={updateSoal} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={id} />
          <select name="tipe" defaultValue={soal.tipe} required className="rounded border border-gray-300 p-2">
            <option value="pg">Pilihan Ganda (PG)</option>
            <option value="essay">Essay</option>
            <option value="benar_salah">Benar/Salah</option>
          </select>
          <KotakInput
            nama="teks"
            label="Teks Soal"
            wajib={true}
            placeholder="Masukkan teks soal"
            defaultValue={soal.teks ?? ""}
          />
          <KotakInput
            nama="bobot"
            label="Bobot"
            wajib={true}
            placeholder="1"
            defaultValue={soal.bobot?.toString() ?? "1"}
          />
          {soal.tipe === "pg" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {["A", "B", "C", "D", "E"].map((h, idx) => (
                  <KotakInput
                    key={h}
                    nama={`opsi_${h}`}
                    label={`Opsi ${h}`}
                    placeholder={`Opsi ${h}`}
                    defaultValue={opsiList[idx] ?? ""}
                  />
                ))}
              </div>
              <KotakInput
                nama="kunci"
                label="Kunci (A‑E)"
                placeholder="A"
                defaultValue={soal.kunci ?? ""}
              />
            </>
          )}
          {soal.tipe === "benar_salah" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Jawaban Benar</label>
                <select name="jawaban_benar" defaultValue={soal.jawaban_benar ? "true" : "false"} className="rounded border border-gray-300 p-2">
                  <option value="true">Benar</option>
                  <option value="false">Salah</option>
                </select>
              </div>
              <KotakInput nama="penjelasan" label="Penjelasan" placeholder="Alasan" defaultValue={soal.penjelasan ?? ""} />
            </>
          )}
          <KotakInput
            nama="pedoman"
            label="Pedoman (optional)"
            placeholder="Pedoman untuk essay"
            defaultValue={soal.pedoman ?? ""}
          />
          <Tombol teks="Perbarui Soal" jenis="utama" />
        </form>
      </Kartu>
    </div>
  );
}

async function HalamanUbahSoal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { id } = await params;
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ubah Soal</h1>
        <a href="/dashboard/soal" className="text-sm text-indigo-600 hover:underline">
          ← Kembali ke Bank Soal
        </a>
      </div>
      <FormUbahSoal id={id} searchParams={searchParams} />
    </>
  );
}

export default function UbahSoalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Suspense fallback={<p className="text-gray-500">Memuat…</p>}>
        <HalamanUbahSoal params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
