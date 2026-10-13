-- Bagian ujian jadi OPSIONAL: soal boleh tanpa bagian (daftar datar).
alter table public.ujian_soal alter column section_id drop not null;

create or replace function public.cek_tipe_section()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_tipe_soal text;
  v_tipe_section text;
begin
  if new.section_id is null then
    return new;
  end if;
  select tipe into v_tipe_soal from public.soal where id = new.soal_id;
  select tipe into v_tipe_section from public.ujian_section where id = new.section_id;
  if v_tipe_section is null then
    raise exception 'Bagian ujian tidak ditemukan';
  end if;
  if v_tipe_section <> v_tipe_soal then
    raise exception 'Tipe soal tidak cocok dengan bagian ini' using errcode = '23514';
  end if;
  return new;
end;
$$;
