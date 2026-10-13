-- ============================================================
-- A. Mapel: mapel_id jadi sumber kebenaran, kolom teks mapel jadi denormal otomatis
-- ============================================================
drop trigger if exists trg_ujian_mapel on public.ujian;
drop trigger if exists trg_bank_soal_mapel on public.bank_soal;
drop function if exists public.selaraskan_mapel();

create or replace function public.isi_mapel_dari_id()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_nama text;
begin
  if new.mapel_id is null then
    new.mapel := null;
  else
    select nama into v_nama from public.mapel where id = new.mapel_id;
    new.mapel := v_nama;
  end if;
  return new;
end;
$$;

create trigger trg_ujian_mapel_id before insert or update of mapel_id on public.ujian
  for each row execute function public.isi_mapel_dari_id();
create trigger trg_bank_soal_mapel_id before insert or update of mapel_id on public.bank_soal
  for each row execute function public.isi_mapel_dari_id();

drop function if exists public.normal_mapel(text);

-- ============================================================
-- B. Versi soal: jejak perubahan + tautan jawaban ke versi soal
-- ============================================================
alter table public.soal add column versi int not null default 1;

create table public.soal_riwayat (
  soal_id uuid not null references public.soal(id) on delete cascade,
  versi int not null,
  guru_id uuid not null references public.guru(id) on delete cascade,
  bank_soal_id uuid,
  tipe text not null,
  teks text not null,
  opsi jsonb not null default '[]',
  kunci text,
  pedoman text,
  jawaban_benar boolean,
  penjelasan text,
  bobot numeric not null default 1,
  disimpan_at timestamptz not null default now(),
  primary key (soal_id, versi)
);
alter table public.soal_riwayat enable row level security;
create policy "guru baca riwayat soalnya" on public.soal_riwayat for select to authenticated
  using (guru_id = (select auth.uid()));
create policy "guru arsip riwayat soalnya" on public.soal_riwayat for insert to authenticated
  with check (guru_id = (select auth.uid()));
create index idx_soal_riwayat_soal on public.soal_riwayat(soal_id);
create index idx_soal_riwayat_guru on public.soal_riwayat(guru_id);

create or replace function public.arsip_versi_soal()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.teks is distinct from old.teks
     or new.opsi is distinct from old.opsi
     or new.kunci is distinct from old.kunci
     or new.pedoman is distinct from old.pedoman
     or new.jawaban_benar is distinct from old.jawaban_benar
     or new.penjelasan is distinct from old.penjelasan
     or new.tipe is distinct from old.tipe
     or new.bobot is distinct from old.bobot
     or new.bank_soal_id is distinct from old.bank_soal_id then
    insert into public.soal_riwayat
      (soal_id, versi, guru_id, bank_soal_id, tipe, teks, opsi, kunci, pedoman, jawaban_benar, penjelasan, bobot)
    values
      (old.id, old.versi, old.guru_id, old.bank_soal_id, old.tipe, old.teks, old.opsi, old.kunci, old.pedoman, old.jawaban_benar, old.penjelasan, old.bobot);
    new.versi := old.versi + 1;
  end if;
  return new;
end;
$$;

create trigger trg_soal_versi before update on public.soal
  for each row execute function public.arsip_versi_soal();

alter table public.jawaban add column soal_versi int;
update public.jawaban set soal_versi = (select versi from public.soal where id = jawaban.soal_id) where soal_versi is null;

create or replace function public.set_soal_versi_jawaban()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.soal_versi := (select versi from public.soal where id = new.soal_id);
  return new;
end;
$$;

create trigger trg_jawaban_soal_versi before insert or update of soal_id on public.jawaban
  for each row execute function public.set_soal_versi_jawaban();

-- ============================================================
-- C. View ekspor untuk machine learning
-- ============================================================
create view public.ml_jawaban with (security_invoker = true) as
select
  u.guru_id,
  u.id as ujian_id, u.judul as ujian_judul,
  mp.nama as mapel,
  k.id as kelas_id, k.nama as kelas_nama,
  s.id as siswa_id, s.nama as siswa_nama, s.no_absen,
  p.id as peserta_id, p.status as peserta_status, p.jumlah_pelanggaran,
  so.id as soal_id, so.tipe as soal_tipe, so.teks as soal_teks,
  j.soal_versi, j.isi as jawaban_isi, j.ragu_ragu, j.skor,
  us.bobot as soal_bobot,
  j.diterima_at
from public.jawaban j
join public.peserta p on p.id = j.peserta_id
join public.ujian u on u.id = p.ujian_id
left join public.mapel mp on mp.id = u.mapel_id
join public.siswa s on s.id = p.siswa_id
join public.kelas k on k.id = s.kelas_id
join public.soal so on so.id = j.soal_id
left join public.ujian_soal us on us.ujian_id = u.id and us.soal_id = so.id;
