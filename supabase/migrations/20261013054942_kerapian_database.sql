-- Kerapian database untuk analisis/ML (Tahap 1, aditif).
-- Kolom teks lama (ujian.mapel, bank_soal.mapel) TETAP ada sampai app dipindah di Tahap 2.

-- ============================================================
-- 1. Master mapel + alias + backfill + FK
-- ============================================================
create table mapel (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
alter table mapel enable row level security;
create policy "mapel dibaca guru" on mapel for select to authenticated using (true);
create policy "mapel ditambah guru" on mapel for insert to authenticated with check (true);

create table mapel_alias (
  alias text primary key,
  mapel_id uuid not null references mapel(id) on delete cascade
);
alter table mapel_alias enable row level security;
create policy "mapel_alias dibaca guru" on mapel_alias for select to authenticated using (true);
create policy "mapel_alias ditambah guru" on mapel_alias for insert to authenticated with check (true);

insert into mapel (nama, slug) values
  ('Pendidikan Agama dan Budi Pekerti','agama'),
  ('Pendidikan Pancasila dan Kewarganegaraan','ppkn'),
  ('Bahasa Indonesia','bahasa indonesia'),
  ('Bahasa Inggris','bahasa inggris'),
  ('Bahasa Daerah','bahasa daerah'),
  ('Matematika','matematika'),
  ('Ilmu Pengetahuan Alam (IPA)','ipa'),
  ('Ilmu Pengetahuan Sosial (IPS)','ips'),
  ('Fisika','fisika'),
  ('Kimia','kimia'),
  ('Biologi','biologi'),
  ('Ekonomi','ekonomi'),
  ('Sejarah','sejarah'),
  ('Geografi','geografi'),
  ('Sosiologi','sosiologi'),
  ('PJOK','pjok'),
  ('Seni Budaya','seni budaya'),
  ('Prakarya dan Kewirausahaan','prakarya'),
  ('Informatika','informatika'),
  ('Bimbingan Konseling','bk')
on conflict (slug) do nothing;

create or replace function normal_mapel(teks text)
returns text language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(teks, '')), '\s+', ' ', 'g'))
$$;

-- tiap mapel jadi alias namanya sendiri
insert into mapel_alias (alias, mapel_id)
select m.slug, m.id from mapel m
on conflict (alias) do nothing;

-- sinonim umum
insert into mapel_alias (alias, mapel_id)
select v.alias, m.id from (values ('ilmu pengetahuan alam'),('i.p.a'),('sains'),('ipa terpadu')) v(alias)
  join mapel m on m.slug = 'ipa' on conflict (alias) do nothing;
insert into mapel_alias (alias, mapel_id)
select v.alias, m.id from (values ('ilmu pengetahuan sosial'),('i.p.s'),('ips terpadu')) v(alias)
  join mapel m on m.slug = 'ips' on conflict (alias) do nothing;
insert into mapel_alias (alias, mapel_id)
select v.alias, m.id from (values ('mtk'),('math'),('matematika wajib')) v(alias)
  join mapel m on m.slug = 'matematika' on conflict (alias) do nothing;
insert into mapel_alias (alias, mapel_id)
select v.alias, m.id from (values ('b. indonesia'),('bindo'),('indo')) v(alias)
  join mapel m on m.slug = 'bahasa indonesia' on conflict (alias) do nothing;
insert into mapel_alias (alias, mapel_id)
select v.alias, m.id from (values ('b. inggris'),('bing'),('english')) v(alias)
  join mapel m on m.slug = 'bahasa inggris' on conflict (alias) do nothing;
insert into mapel_alias (alias, mapel_id)
select v.alias, m.id from (values ('pkn'),('pendidikan pancasila'),('pancasila')) v(alias)
  join mapel m on m.slug = 'ppkn' on conflict (alias) do nothing;
insert into mapel_alias (alias, mapel_id)
select v.alias, m.id from (values ('pai'),('pendidikan agama'),('pendidikan agama islam')) v(alias)
  join mapel m on m.slug = 'agama' on conflict (alias) do nothing;
insert into mapel_alias (alias, mapel_id)
select v.alias, m.id from (values ('penjas'),('penjasorkes'),('olahraga')) v(alias)
  join mapel m on m.slug = 'pjok' on conflict (alias) do nothing;

alter table bank_soal add column mapel_id uuid references mapel(id) on delete set null;
alter table ujian add column mapel_id uuid references mapel(id) on delete set null;
create index idx_bank_soal_mapel on bank_soal(mapel_id);
create index idx_ujian_mapel on ujian(mapel_id);

-- mapel baru untuk teks yang belum dikenali
insert into mapel (nama, slug)
select distinct btrim(mapel), normal_mapel(mapel) from ujian
where normal_mapel(mapel) <> ''
  and normal_mapel(mapel) not in (select slug from mapel)
  and normal_mapel(mapel) not in (select alias from mapel_alias)
on conflict (slug) do nothing;
insert into mapel (nama, slug)
select distinct btrim(mapel), normal_mapel(mapel) from bank_soal
where normal_mapel(mapel) <> ''
  and normal_mapel(mapel) not in (select slug from mapel)
  and normal_mapel(mapel) not in (select alias from mapel_alias)
on conflict (slug) do nothing;

-- alias untuk semua teks lama
insert into mapel_alias (alias, mapel_id)
select distinct normal_mapel(u.mapel), m.id from ujian u
  join mapel m on m.slug = normal_mapel(u.mapel)
where normal_mapel(u.mapel) <> '' on conflict (alias) do nothing;
insert into mapel_alias (alias, mapel_id)
select distinct normal_mapel(b.mapel), m.id from bank_soal b
  join mapel m on m.slug = normal_mapel(b.mapel)
where normal_mapel(b.mapel) <> '' on conflict (alias) do nothing;

-- isi mapel_id
update ujian set mapel_id = a.mapel_id from mapel_alias a
where a.alias = normal_mapel(ujian.mapel) and ujian.mapel_id is null;
update bank_soal set mapel_id = a.mapel_id from mapel_alias a
where a.alias = normal_mapel(bank_soal.mapel) and bank_soal.mapel_id is null;

-- auto-sync selama transisi: teks mapel tetap dijaga konsisten ke mapel_id
create or replace function selaraskan_mapel()
returns trigger language plpgsql as $$
declare
  v_alias text := normal_mapel(new.mapel);
  v_id uuid;
begin
  if v_alias = '' then
    new.mapel_id := null;
    return new;
  end if;
  select mapel_id into v_id from mapel_alias where alias = v_alias;
  if v_id is null then
    insert into mapel (nama, slug) values (btrim(new.mapel), v_alias) on conflict (slug) do nothing;
    select id into v_id from mapel where slug = v_alias;
    insert into mapel_alias (alias, mapel_id) values (v_alias, v_id) on conflict (alias) do nothing;
  end if;
  new.mapel_id := v_id;
  return new;
end;
$$;

create trigger trg_ujian_mapel before insert or update of mapel on ujian
  for each row execute function selaraskan_mapel();
create trigger trg_bank_soal_mapel before insert or update of mapel on bank_soal
  for each row execute function selaraskan_mapel();

-- ============================================================
-- 2. Vocab terkunci: jenis pelanggaran
-- ============================================================
alter table pelanggaran add constraint pelanggaran_jenis_check
  check (jenis in ('pinning_lepas','pindah_app','screenshot','screen_record','multi_window','lain'));

-- ============================================================
-- 3. Anti-duplikat nama kelas & bank per guru (tanpa peduli huruf besar/kecil)
-- ============================================================
create unique index kelas_guru_nama_unik on kelas (guru_id, lower(btrim(nama)));
create unique index bank_soal_guru_nama_unik on bank_soal (guru_id, lower(btrim(nama)));

-- ============================================================
-- 4. Relasi wajib diisi (NOT NULL) - data lama sudah bersih
-- ============================================================
alter table kelas alter column guru_id set not null;
alter table siswa alter column kelas_id set not null;
alter table soal alter column guru_id set not null;
alter table ujian alter column guru_id set not null;
alter table bank_soal alter column guru_id set not null;
alter table peserta alter column ujian_id set not null;
alter table peserta alter column siswa_id set not null;
alter table jawaban alter column peserta_id set not null;
alter table jawaban alter column soal_id set not null;

-- ============================================================
-- 5. Lacak waktu perubahan (updated_at)
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter table guru add column updated_at timestamptz not null default now();
alter table kelas add column updated_at timestamptz not null default now();
alter table siswa add column updated_at timestamptz not null default now();
alter table soal add column updated_at timestamptz not null default now();
alter table bank_soal add column updated_at timestamptz not null default now();
alter table ujian add column updated_at timestamptz not null default now();
alter table peserta add column updated_at timestamptz not null default now();
alter table jawaban add column updated_at timestamptz not null default now();

create trigger trg_guru_updated before update on guru for each row execute function set_updated_at();
create trigger trg_kelas_updated before update on kelas for each row execute function set_updated_at();
create trigger trg_siswa_updated before update on siswa for each row execute function set_updated_at();
create trigger trg_soal_updated before update on soal for each row execute function set_updated_at();
create trigger trg_bank_soal_updated before update on bank_soal for each row execute function set_updated_at();
create trigger trg_ujian_updated before update on ujian for each row execute function set_updated_at();
create trigger trg_peserta_updated before update on peserta for each row execute function set_updated_at();
create trigger trg_jawaban_updated before update on jawaban for each row execute function set_updated_at();

-- ============================================================
-- 6. Validasi nilai (angka & isi soal)
-- ============================================================
alter table ujian add constraint ujian_durasi_check check (durasi > 0);
alter table ujian add constraint ujian_batas_pelanggaran_check check (batas_pelanggaran >= 1);
alter table soal add constraint soal_bobot_check check (bobot > 0);
alter table ujian_soal add constraint ujian_soal_bobot_check check (bobot > 0);
alter table soal add constraint soal_isi_check check (
  (tipe = 'pg' and kunci is not null and jsonb_typeof(opsi) = 'array' and jsonb_array_length(opsi) >= 2)
  or (tipe = 'benar_salah' and jawaban_benar is not null)
  or (tipe = 'essay')
);

-- ============================================================
-- 7. Tambahan index untuk analisis/ML
-- ============================================================
create index idx_pelanggaran_jenis on pelanggaran(jenis);
create index idx_peserta_status on peserta(status);
create index idx_jawaban_diterima on jawaban(diterima_at);
