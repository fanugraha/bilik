-- Impor siswa memakai no_absen sebagai kunci per kelas (tambah baru / perbarui nama).
-- Data cloud dicek 2026-10-12: tidak ada no_absen dobel dalam satu kelas.
-- NULL tetap boleh lebih dari satu (perilaku bawaan unique di Postgres).
alter table siswa
  add constraint siswa_kelas_no_absen_unik unique (kelas_id, no_absen);
