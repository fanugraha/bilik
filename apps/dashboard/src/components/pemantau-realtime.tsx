"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PemantauRealtimeProps = {
  ujianId: string;
  listPesertaId: string[];
};

type StatusSambungan = "menyambung" | "live" | "terputus";

// Jeda minimal antar refresh, supaya autosave banyak siswa tidak membanjiri server
const JEDA_REFRESH_MS = 1500;

export function PemantauRealtime({ ujianId, listPesertaId }: PemantauRealtimeProps) {
  const router = useRouter();
  const [statusSambungan, setStatusSambungan] = useState<StatusSambungan>("menyambung");
  const timerRefresh = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gabungkan jadi string agar efek hanya diulang saat daftar peserta benar-benar berubah
  const kunciPeserta = listPesertaId.join(",");

  useEffect(() => {
    const supabase = createClient();

    function jadwalkanRefresh() {
      if (timerRefresh.current) return;
      timerRefresh.current = setTimeout(() => {
        timerRefresh.current = null;
        router.refresh();
      }, JEDA_REFRESH_MS);
    }

    let channel = supabase
      .channel(`ruang-kontrol-${ujianId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ujian", filter: `id=eq.${ujianId}` }, jadwalkanRefresh)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "peserta", filter: `ujian_id=eq.${ujianId}` },
        jadwalkanRefresh,
      );

    if (kunciPeserta) {
      const filterPeserta = `peserta_id=in.(${kunciPeserta})`;
      channel = channel
        .on("postgres_changes", { event: "*", schema: "public", table: "jawaban", filter: filterPeserta }, jadwalkanRefresh)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "pelanggaran", filter: filterPeserta },
          jadwalkanRefresh,
        );
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setStatusSambungan("live");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setStatusSambungan("terputus");
    });

    return () => {
      if (timerRefresh.current) clearTimeout(timerRefresh.current);
      timerRefresh.current = null;
      supabase.removeChannel(channel);
    };
  }, [ujianId, kunciPeserta, router]);

  let warnaTitik = "bg-kuning";
  let teksStatus = "Menyambung...";
  if (statusSambungan === "live") {
    warnaTitik = "bg-hijau animate-pulse";
    teksStatus = "Langsung";
  } else if (statusSambungan === "terputus") {
    warnaTitik = "bg-merah";
    teksStatus = "Terputus, muat ulang halaman";
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-tinta-2">
      <span className={`h-2 w-2 rounded-full ${warnaTitik}`} />
      {teksStatus}
    </span>
  );
}
