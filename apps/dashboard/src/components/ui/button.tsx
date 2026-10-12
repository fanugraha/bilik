type JenisTombol = "utama" | "kedua" | "bahaya";

type TombolProps = {
  teks: string;
  jenis?: JenisTombol;
  formAction?: (formData: FormData) => void;
  className?: string;
};

const warnaTombol: Record<JenisTombol, string> = {
  utama: "bg-indigo-600 text-white hover:bg-indigo-700",
  kedua: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  bahaya: "bg-red-600 text-white hover:bg-red-700",
};

export function Tombol({ teks, jenis = "utama", formAction, className = "w-full" }: TombolProps) {
  return (
    <button
      formAction={formAction}
      className={`${className} rounded-lg px-4 py-2.5 font-medium transition-colors ${warnaTombol[jenis]}`}
    >
      {teks}
    </button>
  );
}
