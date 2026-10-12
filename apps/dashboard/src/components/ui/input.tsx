type KotakInputProps = {
  nama: string;
  label: string;
  tipe?: "text" | "email" | "password";
  wajib?: boolean;
  minPanjang?: number;
  placeholder?: string;
  defaultValue?: string;
};

export function KotakInput({
  nama,
  label,
  tipe = "text",
  wajib = false,
  minPanjang,
  placeholder,
  defaultValue,
}: KotakInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={nama} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={nama}
        name={nama}
        type={tipe}
        required={wajib}
        minLength={minPanjang}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
