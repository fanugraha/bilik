"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BilahAtas } from "@/components/siswa/rangka-siswa";
import { Kartu } from "@/components/ui/card";
import { Ikon } from "@/components/ui/ikon";
import { LencanaTipeSoal } from "@/components/ui/lencana";
import { kelasTombol } from "@/components/ui/gaya-tombol";
import { ANGKET_PILIHAN } from "@/lib/bagian-ujian";
import { ambilSoal, lapor, simpanJawaban, status as ambilStatus, submit, type HasilSoal, type Soal } from "@/lib/siswa/api";
import { cacheJawaban } from "@/lib/siswa/sesi";

const HURUF = ["A", "B", "C", "D", "E"];
const hurufOpsi = (i: number) => (i < HURUF.length ? HURUF[i] : `${i + 1}`);

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function acak<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatDurasi(totalDetik: number): string {
  const d = Math.max(0, totalDetik);
  const j = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = d % 60;
  const dua = (n: number) => String(n).padStart(2, "0");
  return j > 0 ? `${j}:${dua(m)}:${dua(s)}` : `${dua(m)}:${dua(s)}`;
}

function subscribeOnline(cb: () => void): () => void {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

type Bagian = { id: string; judul: string | null; soal: Soal[] };
type WarnaNomor = "aktif" | "ragu" | "terjawab" | "kosong";

function warnaNomorTombol(warna: WarnaNomor): string {
  if (warna === "aktif") return "border-nila bg-nila text-white";
  if (warna === "ragu") return "border-kuning bg-kuning-muda text-kuning";
  if (warna === "terjawab") return "border-hijau bg-hijau-muda text-hijau";
  return "border-garis-tegas bg-permukaan text-tinta-2 hover:bg-kertas";
}

export function LayarKerjakan({
  token,
  onSelesai,
  onTerkunci,
}: {
  token: string;
  onSelesai: () => void;
  onTerkunci: () => void;
}) {
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [judulUjian, setJudulUjian] = useState("");
  const [bagian, setBagian] = useState<Bagian[]>([]);
  const [idxBagian, setIdxBagian] = useState(0);
  const [idxSoal, setIdxSoal] = useState(0);

  const [isi, setIsi] = useState<Record<string, string | null>>({});
  const [alasan, setAlasan] = useState<Record<string, string | null>>({});
  const [ragu, setRagu] = useState<Record<string, boolean>>({});
  const [urutanOpsi, setUrutanOpsi] = useState<Record<string, number[]>>({});

  const [deadline, setDeadline] = useState<number | null>(null);
  const [sisa, setSisa] = useState(0);
  const [menyimpan, setMenyimpan] = useState(false);
  const [peringatanTab, setPeringatanTab] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState<null | "bagian" | "kumpulkan">(null);
  const offline = useSyncExternalStore(subscribeOnline, () => !navigator.onLine, () => false);

  const pending = useRef<Map<string, { isi: string | null; alasan: string | null; ragu: boolean }>>(new Map());
  const mengakhiri = useRef(false);

  const soalBagian = bagian[idxBagian]?.soal ?? [];
  const soal = soalBagian[idxSoal];
  const totalSoal = useMemo(() => bagian.reduce((a, b) => a + b.soal.length, 0), [bagian]);
  const nomorGlobal = useMemo(() => bagian.slice(0, idxBagian).reduce((a, b) => a + b.soal.length, 0) + idxSoal + 1, [bagian, idxBagian, idxSoal]);
  const terjawab = useMemo(() => bagian.flatMap((b) => b.soal).filter((s) => (isi[s.id] ?? "").toString() !== "").length, [bagian, isi]);
  const jumlahRagu = useMemo(() => bagian.flatMap((b) => b.soal).filter((s) => ragu[s.id]).length, [bagian, ragu]);
  const adaBagianBerikut = idxBagian < bagian.length - 1;
  const soalTerakhirBagian = idxSoal === soalBagian.length - 1;

  const catat = useCallback(
    (s: Soal, patch: Partial<{ isi: string | null; alasan: string | null; ragu: boolean }>) => {
      pending.current.set(s.id, {
        isi: patch.isi !== undefined ? patch.isi : (isi[s.id] ?? null),
        alasan: patch.alasan !== undefined ? patch.alasan : (alasan[s.id] ?? null),
        ragu: patch.ragu !== undefined ? patch.ragu : (ragu[s.id] ?? false),
      });
      cacheJawaban(s.id, pending.current.get(s.id)!);
      setMenyimpan(true);
    },
    [isi, alasan, ragu],
  );

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const hasil: HasilSoal = await ambilSoal(token);
        const rng = prng(hashStr(token));
        const urutan: Record<string, number[]> = {};
        const bagianBaru: Bagian[] = hasil.sections
          .map((sec) => {
            const list = hasil.ujian.acak_soal ? acak(sec.soal, rng) : sec.soal;
            for (const s of list) {
              const indeks = Array.from({ length: s.opsi.length }, (_, i) => i);
              urutan[s.id] = hasil.ujian.acak_opsi ? acak(indeks, prng(hashStr(token) ^ hashStr(s.id))) : indeks;
            }
            return { id: sec.id, judul: sec.judul, soal: list };
          })
          .filter((b) => b.soal.length > 0);

        const isiAwal: Record<string, string | null> = {};
        const alasanAwal: Record<string, string | null> = {};
        const raguAwal: Record<string, boolean> = {};
        for (const j of hasil.jawaban) {
          isiAwal[j.soal_id] = j.isi;
          alasanAwal[j.soal_id] = j.alasan;
          raguAwal[j.soal_id] = j.ragu_ragu;
        }

        if (!aktif) return;
        setBagian(bagianBaru);
        setJudulUjian(hasil.ujian.judul);
        setUrutanOpsi(urutan);
        setIsi(isiAwal);
        setAlasan(alasanAwal);
        setRagu(raguAwal);

        const batas = hasil.peserta.selesai_at ? new Date(hasil.peserta.selesai_at).getTime() : null;
        setDeadline(batas);
        setSisa(batas ? Math.max(0, Math.round((batas - Date.now()) / 1000)) : 0);
        setMemuat(false);
      } catch (e) {
        if (aktif) {
          setError(e instanceof Error ? e.message : "Gagal memuat soal. Periksa sambungan lalu coba lagi.");
          setMemuat(false);
        }
      }
    })();
    return () => {
      aktif = false;
    };
  }, [token]);

  const kirimPending = useCallback(async () => {
    if (pending.current.size === 0) return;
    const batch = [...pending.current.entries()];
    pending.current.clear();
    for (const [soalId, data] of batch) {
      try {
        await simpanJawaban({ token, soalId, isi: data.isi, alasan: data.alasan, raguRagu: data.ragu });
      } catch {
        pending.current.set(soalId, data);
      }
    }
    if (pending.current.size === 0) setMenyimpan(false);
  }, [token]);

  useEffect(() => {
    const t = window.setInterval(() => {
      void kirimPending();
    }, 3000);
    return () => window.clearInterval(t);
  }, [kirimPending]);

  const kumpulkan = useCallback(
    async (paksa: boolean) => {
      if (mengakhiri.current) return;
      if (!paksa) {
        const kurang = bagian.flatMap((b) => b.soal).filter((s) => s.tipe === "benar_salah" && (isi[s.id] ?? "").toString() !== "" && (alasan[s.id] ?? "").trim() === "").length;
        if (kurang > 0) {
          window.alert(`Lengkapi alasan pada ${kurang} soal Benar/Salah sebelum mengumpulkan.`);
          return;
        }
      }
      mengakhiri.current = true;
      setMengirim(true);
      try {
        await kirimPending();
        await submit(token);
        onSelesai();
      } catch {
        mengakhiri.current = false;
        setMengirim(false);
        window.alert("Gagal mengirim. Periksa sambungan lalu coba lagi.");
      }
    },
    [bagian, isi, alasan, kirimPending, token, onSelesai],
  );

  useEffect(() => {
    if (deadline === null) return;
    const t = window.setInterval(() => {
      setSisa(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(t);
  }, [deadline]);

  useEffect(() => {
    if (deadline !== null && sisa <= 0 && !memuat && bagian.length > 0 && !mengakhiri.current) {
      void kumpulkan(true);
    }
  }, [sisa, deadline, memuat, bagian.length, kumpulkan]);

  useEffect(() => {
    const t = window.setInterval(async () => {
      if (mengakhiri.current) return;
      try {
        const s = await ambilStatus(token);
        const st = s.peserta?.status;
        if (st === "terkunci") {
          mengakhiri.current = true;
          onTerkunci();
        } else if (st === "selesai") {
          mengakhiri.current = true;
          onSelesai();
        } else if (s.peserta?.selesai_at) {
          setDeadline(new Date(s.peserta.selesai_at).getTime());
        }
      } catch {
        /* diamkan */
      }
    }, 10000);
    return () => window.clearInterval(t);
  }, [token, onTerkunci, onSelesai]);

  // Anti-curang web: pindah tab saat ujian -> peringatan + catat pelanggaran.
  useEffect(() => {
    async function saatSembunyi() {
      if (document.visibilityState !== "hidden" || mengakhiri.current) return;
      setPeringatanTab(true);
      try {
        const hasil = await lapor(token, "pindah_app", "Pindah tab/aplikasi (web)");
        if (hasil.terkunci && !mengakhiri.current) {
          mengakhiri.current = true;
          onTerkunci();
        }
      } catch {
        /* diamkan */
      }
    }
    document.addEventListener("visibilitychange", saatSembunyi);
    return () => document.removeEventListener("visibilitychange", saatSembunyi);
  }, [token, onTerkunci]);

  // Cegah keluar halaman tanpa sengaja saat ujian berlangsung.
  useEffect(() => {
    const jaga = (e: BeforeUnloadEvent) => {
      if (mengakhiri.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", jaga);
    return () => window.removeEventListener("beforeunload", jaga);
  }, []);

  function ubah(item: Soal, patch: Partial<{ isi: string | null; alasan: string | null; ragu: boolean }>) {
    if (patch.isi !== undefined) setIsi((m) => ({ ...m, [item.id]: patch.isi! }));
    if (patch.alasan !== undefined) setAlasan((m) => ({ ...m, [item.id]: patch.alasan! }));
    if (patch.ragu !== undefined) setRagu((m) => ({ ...m, [item.id]: patch.ragu! }));
    catat(item, patch);
  }

  function warnaUntuk(s: Soal, i: number): WarnaNomor {
    if (i === idxSoal) return "aktif";
    if (ragu[s.id]) return "ragu";
    if ((isi[s.id] ?? "").toString() !== "") return "terjawab";
    return "kosong";
  }

  function lanjutBagian() {
    const kurang = soalBagian.filter((s) => s.tipe === "benar_salah" && (isi[s.id] ?? "").toString() !== "" && (alasan[s.id] ?? "").trim() === "").length;
    if (kurang > 0) {
      window.alert(`Lengkapi alasan pada ${kurang} soal Benar/Salah sebelum lanjut.`);
      return;
    }
    setKonfirmasi("bagian");
  }

  if (memuat) {
    return (
      <>
        <BilahAtas />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-nila/25 border-t-nila" aria-hidden />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <BilahAtas />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
          <div className="w-full max-w-sm space-y-4 text-center">
            <p className="text-sm font-medium text-merah">{error}</p>
            <button type="button" onClick={() => location.reload()} className={`${kelasTombol("utama")} w-full`}>
              Coba lagi
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!soal) {
    return (
      <>
        <BilahAtas />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-tinta-2">Belum ada soal untuk ujian ini.</div>
      </>
    );
  }

  const rendah = sisa <= 60;
  const statusTeks = offline ? "Offline, jawaban tersimpan di perangkat" : menyimpan ? "Menyimpan…" : "Tersimpan";
  const statusWarna = offline ? "text-kuning" : menyimpan ? "text-tinta-2" : "text-hijau";

  return (
    <>
      <BilahAtas
        judul={judulUjian}
        kanan={
          <>
            <span className={`hidden items-center gap-1.5 text-xs sm:inline-flex ${statusWarna}`}>
              <Ikon nama={offline ? "peringatan" : menyimpan ? "putar" : "centang"} className="h-3.5 w-3.5" />
              {statusTeks}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${rendah ? "bg-merah-muda text-merah" : "bg-nila-muda text-nila"}`}>
              <Ikon nama="jam" className="h-4 w-4" />
              <span className="angka">{formatDurasi(sisa)}</span>
            </span>
          </>
        }
      />

      {peringatanTab && (
        <div className="border-b border-kuning/25 bg-kuning-muda px-4 py-2 text-center text-xs font-medium text-kuning sm:px-6">
          Pindah tab terdeteksi dan dicatat sebagai pelanggaran. Tetap di halaman ujian.
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Kolom soal */}
          <div className="min-w-0">
            <div className="mb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-tinta">
                  Soal {nomorGlobal} dari {totalSoal}
                  {bagian.length > 1 && <span className="font-normal text-tinta-2"> · Bagian {idxBagian + 1} dari {bagian.length}{bagian[idxBagian].judul ? `: ${bagian[idxBagian].judul}` : ""}</span>}
                </p>
                <p className="angka text-xs text-tinta-2">{terjawab} dari {totalSoal} terjawab</p>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-garis">
                <div className="h-full rounded-full bg-nila transition-all" style={{ width: `${totalSoal ? (terjawab / totalSoal) * 100 : 0}%` }} />
              </div>
            </div>

            {bagian.length > 1 && (
              <ol className="mb-4 flex flex-wrap gap-2" aria-label="Bagian ujian">
                {bagian.map((b, i) => {
                  const jumlah = b.soal.length;
                  const dijawabBagian = b.soal.filter((s) => (isi[s.id] ?? "").toString() !== "").length;
                  const aktif = i === idxBagian;
                  const selesai = i < idxBagian;
                  const kelas = aktif ? "border-nila bg-nila-muda text-nila" : selesai ? "border-hijau/30 bg-hijau-muda text-hijau" : "border-garis bg-permukaan text-tinta-2";
                  return (
                    <li key={b.id} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${kelas}`} aria-current={aktif ? "step" : undefined}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${aktif ? "bg-nila text-white" : selesai ? "bg-hijau text-white" : "bg-kertas text-tinta-2"}`}>
                        {selesai ? <Ikon nama="centang" className="h-3 w-3" /> : i + 1}
                      </span>
                      <span>{b.judul ?? `Bagian ${i + 1}`}</span>
                      <span className="angka text-xs opacity-80">{dijawabBagian}/{jumlah}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Nomor soal (HP) */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {soalBagian.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIdxSoal(i)}
                  aria-current={i === idxSoal ? "true" : undefined}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${warnaNomorTombol(warnaUntuk(s, i))}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <Kartu>
              <div className="flex items-center justify-between gap-2">
                <LencanaTipeSoal tipe={soal.tipe} />
                <span className="angka text-xs text-tinta-2">Bobot {soal.bobot}</span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-tinta">{soal.teks}</p>
              <div className="mt-5">
                <IsianSoal soal={soal} isi={isi[soal.id] ?? null} alasan={alasan[soal.id] ?? null} urutan={urutanOpsi[soal.id] ?? []} onUbah={(patch) => ubah(soal, patch)} />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-garis pt-4">
                <button
                  type="button"
                  onClick={() => ubah(soal, { ragu: !ragu[soal.id] })}
                  className={`${kelasTombol("kedua", "kecil")} ${ragu[soal.id] ? "border-kuning bg-kuning-muda text-kuning" : ""}`}
                >
                  <Ikon nama="peringatan" className="h-3.5 w-3.5" />
                  {ragu[soal.id] ? "Ditandai ragu-ragu" : "Tandai ragu-ragu"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={idxSoal === 0}
                    onClick={() => setIdxSoal((i) => Math.max(0, i - 1))}
                    className={kelasTombol("kedua")}
                  >
                    Sebelumnya
                  </button>
                  {!soalTerakhirBagian ? (
                    <button type="button" onClick={() => setIdxSoal((i) => i + 1)} className={kelasTombol("utama")}>
                      Berikutnya
                      <Ikon nama="lanjut" className="h-4 w-4" />
                    </button>
                  ) : adaBagianBerikut ? (
                    <button type="button" onClick={lanjutBagian} className={kelasTombol("utama")}>
                      Bagian berikutnya
                      <Ikon nama="lanjut" className="h-4 w-4" />
                    </button>
                  ) : (
                    <button type="button" onClick={() => setKonfirmasi("kumpulkan")} disabled={mengirim} className={kelasTombol("utama")}>
                      <Ikon nama="centang" className="h-4 w-4" />
                      {mengirim ? "Mengirim…" : "Kumpulkan"}
                    </button>
                  )}
                </div>
              </div>
            </Kartu>
          </div>

          {/* Panel samping (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-[4.5rem] space-y-4">
              <Kartu judul="Daftar soal" deskripsi={bagian[idxBagian].judul ?? `Bagian ${idxBagian + 1} dari ${bagian.length}`} tanpaPadding>
                <div className="p-4">
                  {bagian.length > 1 && (
                    <ul className="mb-3 space-y-1 text-xs">
                      {bagian.map((b, i) => {
                        const dijawabBagian = b.soal.filter((s) => (isi[s.id] ?? "").toString() !== "").length;
                        const aktif = i === idxBagian;
                        const selesai = i < idxBagian;
                        return (
                          <li key={b.id} className={`flex items-center justify-between gap-2 ${aktif ? "font-semibold text-nila" : "text-tinta-2"}`}>
                            <span className="flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${aktif ? "bg-nila" : selesai ? "bg-hijau" : "bg-garis-tegas"}`} />
                              {b.judul ?? `Bagian ${i + 1}`}
                            </span>
                            <span className="angka opacity-80">{dijawabBagian}/{b.soal.length}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="grid grid-cols-6 gap-1.5">
                    {soalBagian.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setIdxSoal(i)}
                        aria-current={i === idxSoal ? "true" : undefined}
                        className={`flex h-9 items-center justify-center rounded-lg border text-sm font-bold ${warnaNomorTombol(warnaUntuk(s, i))}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <ul className="mt-4 space-y-1.5 text-xs text-tinta-2">
                    <LiLegenda warna="bg-nila" teks="Sedang dikerjakan" />
                    <LiLegenda warna="bg-hijau" teks="Sudah dijawab" />
                    <LiLegenda warna="bg-kuning" teks="Ditandai ragu-ragu" />
                    <LiLegenda warna="bg-permukaan ring-1 ring-garis-tegas" teks="Belum dijawab" />
                  </ul>
                </div>
              </Kartu>

              <Kartu>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-tinta-2">Terjawab</dt>
                    <dd className="angka font-semibold text-tinta">{terjawab}/{totalSoal}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-tinta-2">Ragu-ragu</dt>
                    <dd className="angka font-semibold text-tinta">{jumlahRagu}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-tinta-2">Sisa waktu</dt>
                    <dd className={`angka font-semibold ${rendah ? "text-merah" : "text-tinta"}`}>{formatDurasi(sisa)}</dd>
                  </div>
                </dl>
                <button type="button" onClick={() => setKonfirmasi("kumpulkan")} disabled={mengirim} className={`${kelasTombol("utama")} mt-4 w-full`}>
                  <Ikon nama="centang" className="h-4 w-4" />
                  {mengirim ? "Mengirim…" : "Kumpulkan jawaban"}
                </button>
              </Kartu>
            </div>
          </aside>
        </div>
      </main>

      {konfirmasi && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-papan/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-xl border border-garis bg-permukaan p-5">
            <p className="text-base font-semibold text-tinta">{konfirmasi === "bagian" ? "Lanjut ke bagian berikutnya?" : "Kumpulkan jawaban?"}</p>
            <p className="mt-1.5 text-sm text-tinta-2">
              {konfirmasi === "bagian" ? "Bagian sebelumnya tidak bisa dibuka lagi setelah lanjut." : "Jawaban tidak bisa diubah lagi setelah dikumpulkan."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setKonfirmasi(null)} className={kelasTombol("kedua")}>
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (konfirmasi === "bagian") {
                    setIdxBagian((i) => i + 1);
                    setIdxSoal(0);
                    setKonfirmasi(null);
                  } else {
                    setKonfirmasi(null);
                    void kumpulkan(false);
                  }
                }}
                className={kelasTombol("utama")}
              >
                {konfirmasi === "bagian" ? "Lanjut" : "Kumpulkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LiLegenda({ warna, teks }: { warna: string; teks: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded ${warna}`} />
      {teks}
    </li>
  );
}

function Opsi({ label, teks, dipilih, onClick }: { label: string; teks: string; dipilih: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-2.5 flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left ${dipilih ? "border-nila bg-nila-muda" : "border-garis-tegas bg-permukaan hover:bg-kertas"}`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${dipilih ? "bg-nila text-white" : "bg-kertas text-tinta-2"}`}>
        {label}
      </span>
      <span className="flex-1 text-sm text-tinta">{teks}</span>
    </button>
  );
}

function IsianSoal({
  soal,
  isi,
  alasan,
  urutan,
  onUbah,
}: {
  soal: Soal;
  isi: string | null;
  alasan: string | null;
  urutan: number[];
  onUbah: (patch: Partial<{ isi: string | null; alasan: string | null }>) => void;
}) {
  if (soal.tipe === "pg") {
    const urutanPakai = urutan.length ? urutan : soal.opsi.map((_, i) => i);
    return (
      <div>
        {urutanPakai.map((asli, posisi) => {
          const nilai = hurufOpsi(asli);
          return <Opsi key={asli} label={hurufOpsi(posisi)} teks={soal.opsi[asli]} dipilih={isi === nilai} onClick={() => onUbah({ isi: isi === nilai ? null : nilai })} />;
        })}
      </div>
    );
  }

  if (soal.tipe === "benar_salah") {
    return (
      <div>
        <Opsi label="B" teks="Benar" dipilih={isi === "benar"} onClick={() => onUbah({ isi: "benar" })} />
        <Opsi label="S" teks="Salah" dipilih={isi === "salah"} onClick={() => onUbah({ isi: "salah" })} />
        <label htmlFor={`alasan-${soal.id}`} className="mb-1.5 mt-1 block text-xs font-semibold text-tinta-2">
          Alasan (wajib)
        </label>
        <textarea
          id={`alasan-${soal.id}`}
          value={alasan ?? ""}
          onChange={(e) => onUbah({ alasan: e.target.value })}
          rows={4}
          placeholder="Jelaskan alasan pernyataan itu benar atau salah"
          className="bidang resize-none"
        />
      </div>
    );
  }

  if (soal.tipe === "angket") {
    return (
      <div>
        {ANGKET_PILIHAN.map((pilihan) => (
          <Opsi key={pilihan.nilai} label={pilihan.nilai} teks={pilihan.teks} dipilih={isi === pilihan.nilai} onClick={() => onUbah({ isi: pilihan.nilai })} />
        ))}
      </div>
    );
  }

  return <textarea value={isi ?? ""} onChange={(e) => onUbah({ isi: e.target.value })} rows={7} placeholder="Tulis jawaban Anda" className="bidang resize-none" />;
}
