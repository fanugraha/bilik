-- Tipe soal baru: 'angket' (skala 1-4: sangat setuju ... sangat tidak setuju).
-- Skor = nilai pilihan (1-4), tanpa kunci, ikut total nilai ujian.

alter table public.soal drop constraint if exists soal_tipe_check;
alter table public.soal add constraint soal_tipe_check check (tipe in ('pg', 'essay', 'benar_salah', 'angket'));

alter table public.soal drop constraint if exists soal_isi_check;
alter table public.soal add constraint soal_isi_check check (
  (tipe = 'pg' and kunci is not null and jsonb_typeof(opsi) = 'array' and jsonb_array_length(opsi) >= 2)
  or (tipe = 'benar_salah' and jawaban_benar is not null)
  or (tipe in ('essay', 'angket'))
);

alter table public.ujian_section drop constraint if exists ujian_section_tipe_check;
alter table public.ujian_section add constraint ujian_section_tipe_check check (tipe in ('pg', 'benar_salah', 'essay', 'angket'));

-- Skor otomatis: PG, Benar/Salah, dan angket (isi '1'..'4' = nilai pilihan).
create or replace function public.nilai_otomatis_ujian(p_ujian_id uuid)
returns void as $$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role'
    and not exists (
      select 1 from ujian where id = p_ujian_id and guru_id = auth.uid()
    ) then
    raise exception 'Ujian tidak ditemukan' using errcode = '42501';
  end if;

  update jawaban
  set skor = case
    when soal.tipe = 'pg' and upper(trim(jawaban.isi)) = upper(soal.kunci) then ujian_soal.bobot
    when soal.tipe = 'benar_salah'
      and lower(trim(jawaban.isi)) = case when soal.jawaban_benar then 'benar' else 'salah' end
      then ujian_soal.bobot
    when soal.tipe = 'angket' and trim(jawaban.isi) in ('1', '2', '3', '4') then trim(jawaban.isi)::numeric
    else 0
  end
  from soal, ujian_soal, peserta
  where jawaban.soal_id = soal.id
    and soal.tipe in ('pg', 'benar_salah', 'angket')
    and ujian_soal.ujian_id = p_ujian_id
    and ujian_soal.soal_id = soal.id
    and peserta.id = jawaban.peserta_id
    and peserta.ujian_id = p_ujian_id;
end;
$$ language plpgsql security definer set search_path = public;
