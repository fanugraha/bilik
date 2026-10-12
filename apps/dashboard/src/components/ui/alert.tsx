import { ReactNode } from "react";

type JenisPesan = "error" | "sukses" | "info";

type PesanProps = {
  children: ReactNode;
  jenis?: JenisPesan;
};

const warnaPesan: Record<JenisPesan, string> = {
  error: "bg-red-50 text-red-800 border-red-200",
  sukses: "bg-green-50 text-green-800 border-green-200",
  info: "bg-blue-50 text-blue-800 border-blue-200",
};

export function Pesan({ children, jenis = "error" }: PesanProps) {
  return (
    <div className={`rounded-lg border p-4 text-sm ${warnaPesan[jenis]}`}>
      {children}
    </div>
  );
}
