-- Fase 7: penutupan ujian otomatis di server, hitung pelanggaran via trigger,
-- dan rate limit kode buka.
-- (Sebagian aksi siswa sudah ada di edge function `siswa`.)

-- 1) Hitung pelanggaran otomatis saat baris pelanggaran masuk.
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
begin
  select p.jumlah_pelanggaran, p.status, u.batas_pelanggaran
    into v_jumlah, v_status, v_batas
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
         status = case when v_jumlah >= coalesce(v_batas, 3) then 'terkunci' else status end
   where id = new.peserta_id;

  return new;
end $$;

drop trigger if exists trg_pelanggaran_masuk on pelanggaran;
create trigger trg_pelanggaran_masuk
after insert on pelanggaran
for each row execute function public.pelanggaran_masuk();

-- 2) Rate limit kode buka: catat tiap percobaan (dipakai edge function `siswa`).
create table if not exists percobaan_buka (
  id uuid primary key default gen_random_uuid(),
  peserta_id uuid references peserta(id) on delete cascade,
  waktu timestamptz default now()
);

create index if not exists idx_percobaan_buka on percobaan_buka(peserta_id, waktu);

alter table percobaan_buka enable row level security;

-- 3) Tutup ujian & peserta yang kehabisan waktu, lalu nilai otomatis.
create or replace function public.tutup_ujian_terlambat()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  update peserta
     set status = 'selesai'
   where status in ('mengerjakan', 'terkunci')
     and selesai_at is not null
     and selesai_at < now();

  for r in
    select id from ujian
     where status = 'berjalan'
       and selesai_at is not null
       and selesai_at < now()
  loop
    update ujian set status = 'selesai' where id = r.id;
    perform public.nilai_otomatis_ujian(r.id);
  end loop;
end $$;

revoke execute on function public.tutup_ujian_terlambat() from public, anon, authenticated;

-- Jadwalkan tiap menit (aman dipanggil berkali-kali; hanya yang terlewat diubah).
create extension if not exists pg_cron;

select cron.schedule(
  'bilik-tutup-ujian-terlambat',
  '* * * * *',
  $$select public.tutup_ujian_terlambat();$$
);
