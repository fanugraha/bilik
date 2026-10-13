-- Perbaikan dari Supabase Advisors (hasil QA otomatis).
--
-- 1) `pelanggaran_masuk()` adalah fungsi trigger (SECURITY DEFINER) yang ikut
--    terekspos di /rest/v1/rpc untuk anon/authenticated. Cabut aksesnya.
revoke execute on function public.pelanggaran_masuk() from public, anon, authenticated;

-- 2) Foreign key tanpa index penutup (performa query relasi).
create index if not exists idx_jawaban_soal on jawaban(soal_id);
create index if not exists idx_kode_buka_peserta on kode_buka(peserta_id);
create index if not exists idx_peserta_siswa on peserta(siswa_id);
create index if not exists idx_ujian_kelas_kelas on ujian_kelas(kelas_id);
create index if not exists idx_ujian_soal_soal on ujian_soal(soal_id);
