-- Penilaian otomatis hanya untuk soal PG.
-- Benar/Salah, essay, dan angket dinilai manual oleh guru (lihat halaman Nilai).
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
  set skor = case when upper(trim(jawaban.isi)) = upper(soal.kunci) then ujian_soal.bobot else 0 end
  from soal, ujian_soal, peserta
  where jawaban.soal_id = soal.id
    and soal.tipe = 'pg'
    and ujian_soal.ujian_id = p_ujian_id
    and ujian_soal.soal_id = soal.id
    and peserta.id = jawaban.peserta_id
    and peserta.ujian_id = p_ujian_id;
end;
$$ language plpgsql security definer set search_path = public;
