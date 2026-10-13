// Supabase bisa mengembalikan relasi sebagai objek atau array, tergantung FK.
export type RelasiSatu<T> = T | T[] | null;

/** Ambil satu baris dari relasi Supabase (objek atau array). */
export function ambilSatu<T>(relasi: RelasiSatu<T>): T | null {
  if (Array.isArray(relasi)) return relasi[0] ?? null;
  return relasi;
}
