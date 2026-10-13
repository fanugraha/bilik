"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PemantauRealtimeProps = {
  ujianId: string;
};

type StatusSambungan = "menyambung" | "live" | "terputus";

// Jeda minimal antar refresh, supaya autosave banyak siswa tidak membanjiri server
const JEDA_REFRESH_MS = 1500;
// Fallback: apa pun yang terjadi, segarkan sendiri tiap beberapa detik.
const JEDA_POLL_MS = 5000;

export function PemantauRealtime({ ujianId }: PemantauRealtimeProps) {
  const router = useRouter();
  const [statusSambungan, setStatusSambungan] = useState<StatusSambungan>("menyambung");
  const timerRefresh = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    function jadwalkanRefresh() {
      if (timerRefresh.current) return;
      timerRefresh.current = setTimeout(() => {
        timerRefresh.current = null;
        router.refresh();
      }, JEDA_REFRESH_MS);
    }

    // Filter tabel besar dihilangkan; RLS sudah membatasi guru hanya menerima
    // baris milik ujiannya. Filter UPDATE yang rapuh (butuh replica identity) dihindari.
    const channel = supabase
      .channel(`ruang-kontrol-${ujianId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ujian", filter: `id=eq.${ujianId}` }, jadwalkanRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "peserta", filter: `ujian_id=eq.${ujianId}` }, jadwalkanRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "jawaban" }, jadwalkanRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pelanggaran" }, jadwalkanRefresh);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setStatusSambungan("live");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setStatusSambungan("terputus");
    });

    // Jaring pengaman bila realtime tidak jalan: poll berkala.
    const poll = setInterval(jadwalkanRefresh, JEDA_POLL_MS);

    return () => {
      clearInterval(poll);
      if (timerRefresh.current) clearTimeout(timerRefresh.current);
      timerRefresh.current = null;
      supabase.removeChannel(channel);
    };
  }, [ujianId, router]);

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
