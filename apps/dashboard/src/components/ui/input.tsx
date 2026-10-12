type KotakInputProps = {
  nama: string;
  label: string;
  tipe?: "text" | "email" | "password" | "number";
  wajib?: boolean;
  minPanjang?: number;
  placeholder?: string;
  defaultValue?: string | number;
  bantuan?: string;
  autoComplete?: string;
};

export function KotakInput({
  nama,
  label,
  tipe = "text",
  wajib = false,
  minPanjang,
  placeholder,
  defaultValue,
  bantuan,
  autoComplete,
}: KotakInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={nama} className="text-sm font-medium text-tinta">
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
        autoComplete={autoComplete}
        aria-describedby={bantuan ? `${nama}-bantuan` : undefined}
        className="bidang"
      />
      {bantuan && (
        <p id={`${nama}-bantuan`} className="text-xs text-tinta-2">
          {bantuan}
        </p>
      )}
    </div>
  );
}
