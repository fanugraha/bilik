import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ambilSatu, type RelasiSatu } from "@/lib/relasi";
import { hitungStatusPeserta, hitungTerjawabPerPeserta, ringkasanStatusUjian } from "@/lib/ruang-kontrol";
import {
  setujuiPeserta,
  setujuiSemuaPeserta,
  mulaiUjian,
  akhiriUjian,
  beriKodeBuka,
  bukaLangsung,
  tolakPeserta,
  resetPerangkat,
  tambahWaktu,
} from "@/actions/kontrol";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Pesan } from "@/components/ui/alert";
import { Ikon } from "@/components/ui/ikon";
import { KepalaHalaman } from "@/components/ui/kepala-halaman";
import { KeadaanKosong } from "@/components/ui/keadaan-kosong";
import { LencanaStatusPeserta, LencanaStatusUjian, Lencana } from "@/components/ui/lencana";
import { TautanTombol } from "@/components/ui/tautan-tombol";
import { TombolKonfirmasi } from "@/components/ui/tombol-konfirmasi";
import { PemantauRealtime } from "@/components/ujian/pemantau-realtime";
import { PapanKode } from "@/components/ujian/papan-kode";
import { HitungMundur } from "@/components/ujian/hitung-mundur";
import { JamLokal } from "@/components/ui/jam-lokal";

export const metadata: Metadata = { title: "Ruang kontrol" };

type ParamRuangKontrol = { error?: string; sukses?: string; kode_buka?: string; nama?: string };

type PesertaItem = {
  id: string;
  status: string;
  disetujui: boolean;
  jumlah_pelanggaran: number;
  tambahan_waktu: number;
  selesai_at: string | null;
  siswa: RelasiSatu<{ nama: string; no_absen: number | null; kelas: RelasiSatu<{ nama: string }> }>;
};

// Tombol di atas papan gelap
const kelasTombolPapanUtama = "bg-white! text-papan! hover:bg-nila-muda!";
const kelasTombolPapanKedua = "border-white/25! bg-transparent! text-white! hover:bg-white/10!";

const kelasInputMenit = "bidang angka w-16! py-1! text-right";

async function RuangKontrol({ ujianId, searchParams }: { ujianId: string; searchParams: Promise<ParamRuangKontrol> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ujian } = await supabase
    .from("ujian")
    .select("id, judul, kode, durasi, status, mulai_at, selesai_at, ujian_kelas(kelas_id)")
    .eq("id", ujianId)
    .eq("guru_id", user.id)
    .single();

  if (!ujian) redirect("/dashboard/ujian");
  if (ujian.status === "draft") redirect(`/dashboard/ujian/${ujianId}/soal`);

  const listKelasId = ((ujian.ujian_kelas ?? []) as { kelas_id: string }[]).map((baris) => baris.kelas_id);

  const [{ data: dataPeserta }, { count: jumlahSoal }, { count: jumlahSiswaTerdaftar }] = await Promise.all([
    supabase
      .from("peserta")
      .select("id, status, disetujui, jumlah_pelanggaran, tambahan_waktu, selesai_at, siswa:siswa_id (nama, no_absen, kelas:kelas_id (nama))")
      .eq("ujian_id", ujianId)
      .order("created_at", { ascending: true }),
    supabase.from("ujian_soal").select("soal_id", { count: "exact", head: true }).eq("ujian_id", ujianId),
    listKelasId.length > 0
      ? supabase.from("siswa").select("id", { count: "exact", head: true }).in("kelas_id", listKelasId)
      : Promise.resolve({ count: 0 }),
  ]);

  const listPeserta = (dataPeserta ?? []) as PesertaItem[];
  const listPesertaId = listPeserta.map((peserta) => peserta.id);

  const { data: listJawabanTerisi } = listPesertaId.length
    ? await supabase.from("jawaban").select("peserta_id").in("peserta_id", listPesertaId).not("isi", "is", null)
    : { data: [] };

  const jumlahTerjawabPerPeserta = hitungTerjawabPerPeserta(listJawabanTerisi ?? []);
  const ringkasan = hitungStatusPeserta(listPeserta);
  const { jumlahMenungguPersetujuan, jumlahDisetujui } = ringkasan;
  const listTerkunci = listPeserta.filter((peserta) => peserta.status === "terkunci");

  const { error: errorQuery, sukses: pesanSukses, kode_buka: kodeBuka, nama: namaKodeBuka } = await searchParams;
  const aktif = ujian.status === "lobby" || ujian.status === "berjalan";

  const ringkasanStatus = ringkasanStatusUjian({
    statusUjian: ujian.status,
    jumlahPeserta: listPeserta.length,
    jumlahSiswaTerdaftar: jumlahSiswaTerdaftar ?? 0,
    jumlahSoal: jumlahSoal ?? 0,
    ringkasan,
  });

  return (
    <>
      <KepalaHalaman
        judul={ujian.judul}
        deskripsi={
          <span className="inline-flex flex-wrap items-center gap-3">
            <LencanaStatusUjian status={ujian.status} />
            {aktif && <PemantauRealtime ujianId={ujianId} />}
          </span>
        }
        kembali={{ href: "/dashboard/ujian", teks: "Semua ujian" }}
        aksi={!aktif && <TautanTombol href={`/dashboard/ujian/${ujianId}/nilai`} teks="Lihat nilai" jenis="utama" />}
      />

      <div className="space-y-6">
        {errorQuery && <Pesan jenis="error">{errorQuery}</Pesan>}
        {pesanSukses && <Pesan jenis="sukses">{pesanSukses}</Pesan>}

        {kodeBuka && (
          <section className="flex flex-col gap-2 rounded-xl border-2 border-merah/30 bg-merah-muda p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-merah">Kode buka untuk {namaKodeBuka || "siswa"}</p>
              <p className="text-sm text-merah/80">Sekali pakai, berlaku 5 menit. Sampaikan langsung ke siswa, jangan diumumkan.</p>
            </div>
            <p className="angka text-4xl font-extrabold tracking-[0.15em] text-merah">{kodeBuka}</p>
          </section>
        )}

        {aktif && (
          <PapanKode
            kode={ujian.kode}
            judul={ujian.judul}
            infoWaktu={
              ujian.status === "berjalan" && ujian.selesai_at ? (
                <div>
                  <p className="text-sm text-white/70">Sisa waktu</p>
                  <HitungMundur selesaiIso={ujian.selesai_at} className="text-4xl font-extrabold" />
                  <p className="mt-1 text-sm text-white/70">
                    Selesai pukul <JamLokal waktuIso={ujian.selesai_at} />
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-white/70">Durasi</p>
                  <p className="angka text-4xl font-extrabold">{ujian.durasi} menit</p>
                  <p className="mt-1 text-sm text-white/70">Timer mulai saat Anda menekan Mulai</p>
                </div>
              )
            }
          >
            {ujian.status === "lobby" && (
              <>
                <form action={mulaiUjian}>
                  <input type="hidden" name="ujian_id" value={ujianId} />
                  <TombolKonfirmasi
                    teks={`Mulai ujian (${jumlahDisetujui} siswa)`}
                    pesanKonfirmasi={`Mulai ujian untuk ${jumlahDisetujui} siswa yang sudah disetujui? Siswa yang belum disetujui tidak ikut.`}
                    className={kelasTombolPapanUtama}
                  />
                </form>
                {jumlahMenungguPersetujuan > 0 && (
                  <form action={setujuiSemuaPeserta}>
                    <input type="hidden" name="ujian_id" value={ujianId} />
                    <Tombol
                      teks={`Setujui semua (${jumlahMenungguPersetujuan})`}
                      jenis="kedua"
                      teksProses="Menyetujui..."
                      className={kelasTombolPapanKedua}
                    />
                  </form>
                )}
              </>
            )}
            {ujian.status === "berjalan" && (
              <>
                <form action={akhiriUjian}>
                  <input type="hidden" name="ujian_id" value={ujianId} />
                  <TombolKonfirmasi
                    teks="Akhiri ujian"
                    jenis="bahaya"
                    pesanKonfirmasi="Akhiri ujian untuk semua siswa sekarang? Jawaban dikunci dan tidak bisa diubah lagi."
                  />
                </form>
                <form action={tambahWaktu} className="flex items-center gap-2">
                  <input type="hidden" name="ujian_id" value={ujianId} />
                  <input
                    type="number"
                    name="menit"
                    min={1}
                    max={120}
                    defaultValue={5}
                    aria-label="Menit tambahan untuk semua siswa"
                    className={kelasInputMenit}
                  />
                  <TombolKonfirmasi
                    teks="menit untuk semua"
                    ikon="tambah"
                    jenis="kedua"
                    pesanKonfirmasi="Tambah waktu untuk semua siswa yang masih mengerjakan?"
                    className={kelasTombolPapanKedua}
                  />
                </form>
              </>
            )}
          </PapanKode>
        )}

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-garis bg-garis sm:grid-cols-4">
          {ringkasanStatus.map((item) => (
            <div key={item.teks} className="bg-permukaan px-5 py-4">
              <dt className="text-sm text-tinta-2">{item.teks}</dt>
              <dd className={`angka mt-1 text-2xl font-bold ${item.warna}`}>
                {item.jumlah}
                {item.dari !== undefined && <span className="text-base font-medium text-tinta-3"> / {item.dari}</span>}
              </dd>
            </div>
          ))}
        </dl>

        {listTerkunci.length > 0 && (
          <Kartu
            judul={`Antrean terkunci (${listTerkunci.length})`}
            deskripsi="HP siswa ini terkunci karena melewati batas pelanggaran. Pastikan siswanya di kelas, lalu beri kode buka."
            className="border-merah/30"
            tanpaPadding
          >
            <ul className="divide-y divide-garis">
              {listTerkunci.map((peserta) => {
                const siswa = ambilSatu(peserta.siswa);
                return (
                  <li key={peserta.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="flex items-center gap-3">
                      <Ikon nama="kunci" className="h-4 w-4 text-merah" />
                      <span className="font-semibold text-tinta">{siswa?.nama}</span>
                      <span className="text-sm text-tinta-2">{peserta.jumlah_pelanggaran} pelanggaran</span>
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <form action={beriKodeBuka}>
                        <input type="hidden" name="ujian_id" value={ujianId} />
                        <input type="hidden" name="peserta_id" value={peserta.id} />
                        <Tombol teks="Beri kode buka" jenis="kedua" ukuran="kecil" teksProses="Membuat kode..." />
                      </form>
                      <form action={bukaLangsung}>
                        <input type="hidden" name="ujian_id" value={ujianId} />
                        <input type="hidden" name="peserta_id" value={peserta.id} />
                        <TombolKonfirmasi
                          teks="Buka langsung"
                          jenis="bahaya"
                          ukuran="kecil"
                          pesanKonfirmasi={`Buka kunci ${siswa?.nama ?? "siswa ini"} tanpa kode?`}
                        />
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Kartu>
        )}

        <Kartu judul="Peserta" deskripsi={`${listPeserta.length} siswa di ruang ujian`} tanpaPadding>
          {listPeserta.length === 0 ? (
            <KeadaanKosong
              ikon="kelas"
              judul={ujian.status === "lobby" ? "Menunggu siswa bergabung" : "Tidak ada peserta"}
              deskripsi={
                ujian.status === "lobby"
                  ? "Tampilkan kode di proyektor. Siswa yang masuk muncul di sini tanpa perlu memuat ulang halaman."
                  : "Tidak ada siswa yang bergabung ke ujian ini."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-garis text-xs font-semibold text-tinta-2">
                  <tr>
                    <th className="px-5 py-2.5">Siswa</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Terjawab</th>
                    <th className="px-3 py-2.5">Pelanggaran</th>
                    <th className="px-5 py-2.5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-garis">
                  {listPeserta.map((peserta) => {
                    const siswa = ambilSatu(peserta.siswa);
                    const kelas = siswa ? ambilSatu(siswa.kelas) : null;
                    const terjawab = jumlahTerjawabPerPeserta.get(peserta.id) ?? 0;
                    const persenTerjawab = jumlahSoal ? Math.round((terjawab / jumlahSoal) * 100) : 0;
                    return (
                      <tr key={peserta.id} className={peserta.status === "terkunci" ? "bg-merah-muda/50" : ""}>
                        <td className="px-5 py-3">
                          <span className="block font-semibold text-tinta">{siswa?.nama}</span>
                          <span className="text-xs text-tinta-2">
                            {kelas?.nama}, no. {siswa?.no_absen ?? "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex flex-wrap items-center gap-1.5">
                            {peserta.disetujui ? (
                              <LencanaStatusPeserta status={peserta.status} />
                            ) : (
                              <Lencana nada="biru">Perlu disetujui</Lencana>
                            )}
                            {peserta.tambahan_waktu > 0 && <Lencana nada="nila">+{peserta.tambahan_waktu} mnt</Lencana>}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {ujian.status === "lobby" ? (
                            <span className="text-tinta-3">-</span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-kertas ring-1 ring-garis" aria-hidden="true">
                                <span className="block h-full rounded-full bg-nila" style={{ width: `${persenTerjawab}%` }} />
                              </span>
                              <span className="angka text-xs text-tinta-2">
                                {terjawab}/{jumlahSoal ?? 0}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {peserta.jumlah_pelanggaran > 0 ? (
                            <span className="angka font-semibold text-merah">{peserta.jumlah_pelanggaran}</span>
                          ) : (
                            <span className="text-tinta-3">0</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {aktif && !peserta.disetujui && (
                              <form action={setujuiPeserta}>
                                <input type="hidden" name="ujian_id" value={ujianId} />
                                <input type="hidden" name="peserta_id" value={peserta.id} />
                                <input type="hidden" name="setujui" value="true" />
                                <Tombol teks="Setujui" ukuran="kecil" teksProses="..." />
                              </form>
                            )}
                            {ujian.status === "lobby" && peserta.disetujui && (
                              <form action={setujuiPeserta}>
                                <input type="hidden" name="ujian_id" value={ujianId} />
                                <input type="hidden" name="peserta_id" value={peserta.id} />
                                <input type="hidden" name="setujui" value="false" />
                                <Tombol teks="Batalkan" jenis="hantu" ukuran="kecil" teksProses="..." />
                              </form>
                            )}
                            {ujian.status === "lobby" && (
                              <form action={tolakPeserta}>
                                <input type="hidden" name="ujian_id" value={ujianId} />
                                <input type="hidden" name="peserta_id" value={peserta.id} />
                                <TombolKonfirmasi
                                  teks="Tolak"
                                  jenis="hantu"
                                  ukuran="kecil"
                                  pesanKonfirmasi={`Tolak ${siswa?.nama ?? "siswa ini"}? Nama akan bisa dipilih lagi oleh siswa yang benar.`}
                                  className="hover:text-merah"
                                />
                              </form>
                            )}
                            {peserta.status === "terkunci" && (
                              <form action={beriKodeBuka}>
                                <input type="hidden" name="ujian_id" value={ujianId} />
                                <input type="hidden" name="peserta_id" value={peserta.id} />
                                <Tombol teks="Kode buka" jenis="bahaya" ukuran="kecil" teksProses="..." />
                              </form>
                            )}
                            {aktif && (
                              <details className="relative">
                                <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-lg px-2.5 text-xs font-semibold text-tinta-2 hover:bg-kertas">
                                  Lainnya
                                </summary>
                                <div className="absolute right-0 z-10 mt-1 w-72 space-y-4 rounded-lg border border-garis bg-permukaan p-4 text-left shadow-lg">
                                  {ujian.status === "berjalan" && (peserta.status === "mengerjakan" || peserta.status === "terkunci") && (
                                    <form action={tambahWaktu}>
                                      <p className="mb-2 text-xs font-semibold text-tinta">Tambah waktu untuk siswa ini</p>
                                      <div className="flex items-center gap-2">
                                        <input type="hidden" name="ujian_id" value={ujianId} />
                                        <input type="hidden" name="peserta_id" value={peserta.id} />
                                        <input type="number" name="menit" min={1} max={120} defaultValue={5} aria-label="Menit" className={kelasInputMenit} />
                                        <span className="text-xs text-tinta-2">menit</span>
                                        <TombolKonfirmasi
                                          teks="Tambah"
                                          jenis="kedua"
                                          ukuran="kecil"
                                          pesanKonfirmasi={`Tambah waktu untuk ${siswa?.nama ?? "siswa ini"}?`}
                                        />
                                      </div>
                                    </form>
                                  )}
                                  <form action={resetPerangkat}>
                                    <p className="mb-1 text-xs font-semibold text-tinta">Ganti HP atau nama salah pilih</p>
                                    <p className="mb-2 text-xs text-tinta-2">
                                      Melepas HP lama. Siswa masuk lagi dari HP lain dan perlu disetujui ulang. Jawaban tetap tersimpan.
                                    </p>
                                    <input type="hidden" name="ujian_id" value={ujianId} />
                                    <input type="hidden" name="peserta_id" value={peserta.id} />
                                    <TombolKonfirmasi
                                      teks="Lepas HP"
                                      jenis="kedua"
                                      ukuran="kecil"
                                      pesanKonfirmasi={`Lepas HP ${siswa?.nama ?? "siswa ini"}? Siswa perlu masuk lagi dan disetujui ulang.`}
                                    />
                                  </form>
                                </div>
                              </details>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Kartu>
      </div>
    </>
  );
}

export default function LobbyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ParamRuangKontrol> }) {
  return (
    <Suspense fallback={<p className="text-sm text-tinta-2">Memuat ruang kontrol...</p>}>
      <HalamanLobby params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function HalamanLobby({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ParamRuangKontrol> }) {
  const { id } = await params;
  return <RuangKontrol ujianId={id} searchParams={searchParams} />;
}
