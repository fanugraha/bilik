-- Bagian (section) ujian: satu tipe soal per bagian, urut, bisa diubah guru.
create table public.ujian_section (
  id uuid primary key default gen_random_uuid(),
  ujian_id uuid not null references public.ujian(id) on delete cascade,
  urutan int not null,
  judul text,
  tipe text not null check (tipe in ('pg','benar_salah','essay')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ujian_id, urutan)
);
alter table public.ujian_section enable row level security;
create policy "Guru kelola section ujiannya" on public.ujian_section for all
  using (exists (select 1 from public.ujian where ujian.id = ujian_section.ujian_id and ujian.guru_id = (select auth.uid())))
  with check (exists (select 1 from public.ujian where ujian.id = ujian_section.ujian_id and ujian.guru_id = (select auth.uid())));
create index idx_ujian_section_ujian on public.ujian_section(ujian_id);
create trigger trg_ujian_section_updated before update on public.ujian_section for each row execute function public.set_updated_at();

alter table public.ujian_soal add column section_id uuid references public.ujian_section(id) on delete cascade;
create index idx_ujian_soal_section on public.ujian_soal(section_id);

-- Backfill soal lama: satu bagian per tipe per ujian (data lama saat ini kosong)
insert into public.ujian_section (ujian_id, urutan, judul, tipe)
select x.ujian_id, row_number() over (partition by x.ujian_id order by x.tipe), initcap(x.tipe), x.tipe
from (select distinct us.ujian_id, s.tipe from public.ujian_soal us join public.soal s on s.id = us.soal_id) x
on conflict (ujian_id, urutan) do nothing;

update public.ujian_soal us
set section_id = (
  select usc.id from public.ujian_section usc
  join public.soal s on s.id = us.soal_id
  where usc.ujian_id = us.ujian_id and usc.tipe = s.tipe
  order by usc.urutan limit 1
)
where us.section_id is null;

alter table public.ujian_soal alter column section_id set not null;

-- Soal di sebuah bagian wajib bertipe sama dengan bagiannya
create or replace function public.cek_tipe_section()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_tipe_soal text;
  v_tipe_section text;
begin
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
create trigger trg_ujian_soal_tipe before insert or update of section_id, soal_id on public.ujian_soal
  for each row execute function public.cek_tipe_section();
