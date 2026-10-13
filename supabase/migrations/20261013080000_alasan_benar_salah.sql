-- Soal Benar/Salah: siswa wajib menuliskan alasan di samping pilihan benar/salah.
alter table public.jawaban add column alasan text;

create or replace view public.ml_jawaban with (security_invoker = true) as
select
  u.guru_id,
  u.id as ujian_id, u.judul as ujian_judul,
  mp.nama as mapel,
  k.id as kelas_id, k.nama as kelas_nama,
  s.id as siswa_id, s.nama as siswa_nama, s.no_absen,
  p.id as peserta_id, p.status as peserta_status, p.jumlah_pelanggaran,
  so.id as soal_id, so.tipe as soal_tipe, so.teks as soal_teks,
  j.soal_versi, j.isi as jawaban_isi, j.ragu_ragu, j.skor,
  us.bobot as soal_bobot,
  j.diterima_at,
  j.alasan
from public.jawaban j
join public.peserta p on p.id = j.peserta_id
join public.ujian u on u.id = p.ujian_id
left join public.mapel mp on mp.id = u.mapel_id
join public.siswa s on s.id = p.siswa_id
join public.kelas k on k.id = s.kelas_id
join public.soal so on so.id = j.soal_id
left join public.ujian_soal us on us.ujian_id = u.id and us.soal_id = so.id;
