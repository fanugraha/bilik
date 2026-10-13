import type { User } from "@supabase/supabase-js";
import { rapikanNamaOrang } from "./nama";

export const PANJANG_KATA_SANDI_MIN = 8;
// Supabase (bcrypt) hanya memakai 72 karakter pertama; sisanya diam-diam diabaikan
const PANJANG_KATA_SANDI_MAKS = 72;
export const ATURAN_KATA_SANDI = `Minimal ${PANJANG_KATA_SANDI_MIN} karakter, memuat huruf besar, huruf kecil, angka, dan simbol.`;
const PANJANG_NAMA_MAKS = 100;

// Trigger buat_profil_guru mengisi nama dari bagian depan email (atau "Guru") bila
// metadata tidak membawa nama, misalnya akun Google lama. Nama seperti itu belum diisi guru.
export function namaMasihBawaan(nama: string | null | undefined, email: string | null | undefined) {
  const namaRapi = nama?.trim() ?? "";
  if (!namaRapi || namaRapi === "Guru") return true;
  return !!email && namaRapi === email.split("@")[0];
}

export function cekNamaGuru(mentah: string): { nama: string } | { error: string } {
  const nama = rapikanNamaOrang(mentah);
  if (!nama) return { error: "Nama wajib diisi" };
  if (nama.length > PANJANG_NAMA_MAKS) return { error: `Nama maksimal ${PANJANG_NAMA_MAKS} karakter` };
  return { nama };
}

// Mengembalikan pesan error, atau null bila kata sandi baru boleh disimpan.
// kataSandiLama diisi bila diketahui (ganti kata sandi akun email).
export function cekKataSandiBaru(password: string, konfirmasi: string, kataSandiLama?: string) {
  if (!password || password.length < PANJANG_KATA_SANDI_MIN) return `Kata sandi minimal ${PANJANG_KATA_SANDI_MIN} karakter`;
  if (password.length > PANJANG_KATA_SANDI_MAKS) return `Kata sandi maksimal ${PANJANG_KATA_SANDI_MAKS} karakter`;
  if (password !== password.trim()) return "Kata sandi tidak boleh diawali atau diakhiri spasi";
  if (!/[a-z]/.test(password)) return "Kata sandi harus memuat huruf kecil";
  if (!/[A-Z]/.test(password)) return "Kata sandi harus memuat huruf besar";
  if (!/[0-9]/.test(password)) return "Kata sandi harus memuat angka";
  if (!/[^A-Za-z0-9\s]/.test(password)) return "Kata sandi harus memuat simbol (contoh: ! @ # $ %)";
  if (password !== konfirmasi) return "Konfirmasi kata sandi tidak cocok";
  if (kataSandiLama !== undefined && password === kataSandiLama) return "Kata sandi baru harus berbeda dari kata sandi lama";
  return null;
}

// Akun yang daftar lewat email punya kata sandi. Akun Google saja tetap tercatat "google"
// walau kata sandi sudah dibuat, jadi ini tidak bisa dipakai untuk tahu ada-tidaknya kata sandi.
export function punyaLoginEmail(user: Pick<User, "app_metadata">) {
  const providers = (user.app_metadata.providers as string[] | undefined) ?? [user.app_metadata.provider];
  return providers.includes("email");
}
