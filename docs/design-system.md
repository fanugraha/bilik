# Design System Bilik (Dashboard Guru)

Arah: **tenang & profesional**. Dashboard dipakai guru berjam-jam dan saat ujian berlangsung, jadi tampilannya harus tenang, mudah dipindai, dan jelas soal status. Satu elemen dibuat menonjol: **papan kode ujian** di ruang kontrol, yang harus terbaca dari belakang kelas lewat proyektor.

Sumber kebenaran token: `apps/dashboard/src/app/globals.css` (`@theme`).

## Warna

| Token | Hex | Pakai untuk |
|---|---|---|
| `kertas` | `#F4F5F7` | Latar aplikasi |
| `permukaan` | `#FFFFFF` | Panel, kartu, input |
| `garis` / `garis-tegas` | `#E2E5EA` / `#C9CED6` | Batas panel & tabel / batas input |
| `tinta` | `#1B2130` | Teks utama |
| `tinta-2` | `#566074` | Teks sekunder, label tabel |
| `tinta-3` | `#8A93A3` | Placeholder, angka redup |
| `nila` / `nila-tua` | `#4338CA` / `#3730A3` | Aksi utama, menu aktif, tautan |
| `nila-muda` | `#EEF0FE` | Latar elemen terpilih |
| `papan` | `#1E1B4B` | Papan kode ujian, panel merek login |

### Bahasa warna status (wajib konsisten)

| Status | Warna | Token |
|---|---|---|
| Draft | abu | `kertas` + `tinta-2` |
| Lobby dibuka / menunggu persetujuan | biru | `biru` / `biru-muda` |
| Berjalan / mengerjakan / benar | hijau | `hijau` / `hijau-muda` |
| Terkunci / salah / pelanggaran | merah | `merah` / `merah-muda` |
| Selesai / essay belum dikoreksi | kuning | `kuning` / `kuning-muda` |
| Dinilai | ungu | `ungu` / `ungu-muda` |

Pemetaan status ada di satu tempat: `components/ui/lencana.tsx` (`LencanaStatusUjian`, `LencanaStatusPeserta`, `LencanaTipeSoal`).

## Tipografi

- **Plus Jakarta Sans** (400-800), satu keluarga untuk semua teks. Dipilih karena lahir dari identitas kota Jakarta: lokal, modern, mudah dibaca di layar.
- Skala: 12 (meta) / 14 (isi, default dashboard) / 16 / 20 / 24 (judul halaman) / 60-72 (kode ujian).
- Angka nilai, timer, kode, nomor absen memakai utilitas `angka` (tabular-nums) agar kolom tidak bergeser.
- Hindari: label HURUF BESAR, pemisah titik tengah (`A · B`), satu kata diwarnai beda di judul.

## Bentuk & ruang

- Radius: input & tombol `rounded-lg` (8px), panel `rounded-xl` (12px), papan `rounded-2xl`, lencana `rounded-full`.
- Panel memakai **border tipis tanpa bayangan**. Bayangan hanya untuk elemen melayang (menu "Lainnya", laci menu HP, bilah simpan lengket).
- Data ditampilkan sebagai **daftar/tabel**, bukan grid kartu yang seragam.

## Tata letak

```
┌──────────┬────────────────────────────────────┐
│ ◆ Bilik  │ ‹ Kembali                          │
│          │ Judul halaman          [Aksi utama]│
│ Beranda  │ Deskripsi satu kalimat             │
│ Kelas    │ ┌────────────────────────────────┐ │
│ Bank soal│ │ Panel                          │ │
│ Ujian    │ └────────────────────────────────┘ │
│ ──────── │                                    │
│ Guru     │                                    │
│ Keluar   │                                    │
└──────────┴────────────────────────────────────┘
```

- Desktop (`lg`): sidebar tetap 256px. HP/tablet: bilah atas + laci menu.
- Isi rata kiri, lebar maks `max-w-6xl`; halaman form `max-w-3xl`.
- Setiap halaman memakai `KepalaHalaman` (judul, deskripsi, tautan kembali, aksi).

## Komponen (`apps/dashboard/src/components/ui/`)

| Komponen | Fungsi |
|---|---|
| `Tombol` | Submit form; nonaktif + teks proses selama aksi berjalan. Jenis: `utama`, `kedua`, `bahaya`, `hantu`. Ukuran: `kecil`, `sedang`, `besar`. |
| `TombolKonfirmasi` | `Tombol` yang minta konfirmasi; wajib untuk hapus, mulai/akhiri ujian, lepas HP. |
| `TautanTombol` | Link bergaya tombol (jangan bungkus `<button>` di dalam `<a>`). |
| `Kartu` | Panel dengan kepala opsional (judul, deskripsi, aksi). |
| `Pesan` | Info / sukses / peringatan / error, dengan ikon. |
| `KotakInput`, kelas `bidang` | Isian form standar. |
| `Lencana` | Label status/tipe. |
| `KepalaHalaman`, `KeadaanKosong`, `Ikon` | Kepala halaman, layar kosong yang memberi arah, ikon garis. |

Komponen halaman khusus: `navigasi-samping`, `cangkang-auth`, `papan-kode` (mode layar penuh untuk proyektor), `hitung-mundur`, `pemantau-realtime`, `form-soal`, `isian-ujian`, `form-impor-siswa`.

## Prinsip interaksi

1. **Setiap layar menjawab "apa selanjutnya"**: aksi utama di kanan atas; layar kosong menjelaskan langkah berikutnya.
2. **Setiap klik ada umpan balik**: tombol menampilkan status proses; hasil ditampilkan lewat `Pesan`.
3. **Aksi yang sulit dibatalkan selalu dikonfirmasi**, dengan kalimat yang menyebut akibatnya.
4. **Gerak secukupnya**: hanya titik "langsung" berdenyut dan transisi warna hover; `prefers-reduced-motion` dihormati.
5. **Bahasa**: kalimat biasa (sentence case), kata kerja aktif, sudut pandang guru ("Buka lobby", bukan "Generate kode").
