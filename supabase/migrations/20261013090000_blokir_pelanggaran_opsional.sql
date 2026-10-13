-- Blokir HP saat pelanggaran kini bisa dinyalakan/dimatikan per ujian.
-- Saat dimatikan, pelanggaran tetap dicatat (jumlah_pelanggaran) tapi siswa tidak dikunci.
alter table public.ujian add column blokir_pelanggaran boolean not null default true;

create or replace function public.pelanggaran_masuk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jumlah int;
  v_status text;
  v_batas int;
  v_blokir boolean;
begin
  select p.jumlah_pelanggaran, p.status, u.batas_pelanggaran, u.blokir_pelanggaran
    into v_jumlah, v_status, v_batas, v_blokir
  from peserta p
  join ujian u on u.id = p.ujian_id
  where p.id = new.peserta_id;

  -- Peserta tak dikenal atau sudah selesai: hanya simpan pelanggarannya.
  if v_status is null or v_status = 'selesai' then
    return new;
  end if;

  v_jumlah := coalesce(v_jumlah, 0) + 1;

  update peserta
     set jumlah_pelanggaran = v_jumlah,
         status = case
           when coalesce(v_blokir, true) and v_jumlah >= coalesce(v_batas, 3) then 'terkunci'
           else status
         end
   where id = new.peserta_id;

  return new;
end $$;
