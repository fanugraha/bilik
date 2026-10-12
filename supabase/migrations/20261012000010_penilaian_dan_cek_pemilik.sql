-- Fungsi security definer melewati RLS, jadi wajib cek sendiri bahwa pemanggil
-- adalah guru pemilik ujian (atau service_role untuk edge function).

-- 1. Kode buka: hanya guru pemilik ujian peserta tersebut
create or replace function generate_kode_buka(p_peserta_id uuid)
returns text as $$
declare
  kode_baru text;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role'
    and not exists (
      select 1 from peserta p
      join ujian u on u.id = p.ujian_id
      where p.id = p_peserta_id and u.guru_id = auth.uid()
    ) then
    raise exception 'Peserta tidak ditemukan' using errcode = '42501';
  end if;

  kode_baru := generate_kode_ujian();
  insert into kode_buka (peserta_id, kode, kedaluwarsa_at)
  values (p_peserta_id, kode_baru, now() + interval '5 minutes');
  return kode_baru;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Skor PG lama: tambah cek pemilik
create or replace function hitung_skor_pg(p_ujian_id uuid, p_peserta_id uuid)
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
  from soal, ujian_soal
  where jawaban.peserta_id = p_peserta_id
    and jawaban.soal_id = soal.id
    and soal.tipe = 'pg'
    and ujian_soal.ujian_id = p_ujian_id
    and ujian_soal.soal_id = soal.id;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Nilai otomatis satu ujian: PG + Benar/Salah untuk semua peserta.
-- Format jawaban.isi: PG = huruf opsi asli ('A'..'E'), Benar/Salah = 'benar' / 'salah'.
-- Essay tidak disentuh (dikoreksi manual guru).
create or replace function nilai_otomatis_ujian(p_ujian_id uuid)
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
    else 0
  end
  from soal, ujian_soal, peserta
  where jawaban.soal_id = soal.id
    and soal.tipe in ('pg', 'benar_salah')
    and ujian_soal.ujian_id = p_ujian_id
    and ujian_soal.soal_id = soal.id
    and peserta.id = jawaban.peserta_id
    and peserta.ujian_id = p_ujian_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.nilai_otomatis_ujian(uuid) from public, anon;
grant execute on function public.nilai_otomatis_ujian(uuid) to authenticated, service_role;
