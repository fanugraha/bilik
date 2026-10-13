-- Realtime ruang kontrol: event UPDATE (autosave/ubah status) perlu membawa
-- kolom lengkap agar filter `peserta_id`/`ujian_id` dan evaluasi RLS bekerja.
-- Tanpa REPLICA IDENTITY FULL, event UPDATE hanya membawa primary key.
alter table ujian replica identity full;
alter table peserta replica identity full;
alter table jawaban replica identity full;
alter table pelanggaran replica identity full;
