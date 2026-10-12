-- Tipe soal: tambah 'benar_salah' (jawaban benar/salah + penjelasan)
alter table soal drop constraint if exists soal_tipe_check;
alter table soal add column jawaban_benar boolean;
alter table soal add column penjelasan text;
alter table soal add constraint soal_tipe_check check (tipe in ('pg', 'essay', 'benar_salah'));