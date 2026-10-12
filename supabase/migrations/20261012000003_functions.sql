-- Edge function helpers (PRD 8): penilaian otomatis PG, validasi waktu server, kode buka.
-- Implementasi lengkap ada di supabase/functions/, ini hanya placeholder struktur.

-- Fungsi bantuan: hitung skor PG otomatis
create or replace function hitung_skor_pg(p_ujian_id uuid, p_peserta_id uuid)
returns void as $$
begin
  update jawaban
  set skor = (
    case 
      when jawaban.isi = soal.kunci then ujian_soal.bobot
      else 0
    end
  )
  from soal, ujian_soal, peserta
  where jawaban.peserta_id = p_peserta_id
    and jawaban.soal_id = soal.id
    and soal.tipe = 'pg'
    and ujian_soal.ujian_id = p_ujian_id
    and ujian_soal.soal_id = soal.id
    and peserta.id = p_peserta_id;
end;
$$ language plpgsql security definer;

-- Fungsi bantuan: generate kode ujian unik 6 karakter
create or replace function generate_kode_ujian()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- Fungsi bantuan: generate kode buka sekali pakai
create or replace function generate_kode_buka(p_peserta_id uuid)
returns text as $$
declare
  kode_baru text;
begin
  kode_baru := generate_kode_ujian();
  insert into kode_buka (peserta_id, kode, kedaluwarsa_at)
  values (p_peserta_id, kode_baru, now() + interval '5 minutes');
  return kode_baru;
end;
$$ language plpgsql security definer;
