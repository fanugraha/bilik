-- PRD bagian 7: Model Data
-- Status ujian: draft | lobby | berjalan | selesai | dinilai
-- Status peserta: menunggu | mengerjakan | terkunci | selesai

create table guru (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  email text unique not null,
  created_at timestamptz default now()
);

create table kelas (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid references guru(id) on delete cascade,
  nama text not null,
  created_at timestamptz default now()
);

create table siswa (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid references kelas(id) on delete cascade,
  nama text not null,
  no_absen int,
  created_at timestamptz default now()
);

create table soal (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid references guru(id) on delete cascade,
  tipe text not null check (tipe in ('pg', 'essay')),
  teks text not null,
  opsi jsonb default '[]',
  kunci text,
  pedoman text,
  bobot numeric default 1,
  created_at timestamptz default now()
);

create table ujian (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid references guru(id) on delete cascade,
  judul text not null,
  mapel text,
  durasi int not null,
  acak_soal boolean default false,
  acak_opsi boolean default false,
  batas_pelanggaran int default 3,
  kode text unique,
  status text default 'draft' check (status in ('draft', 'lobby', 'berjalan', 'selesai', 'dinilai')),
  mulai_at timestamptz,
  selesai_at timestamptz,
  created_at timestamptz default now()
);

create table ujian_kelas (
  ujian_id uuid references ujian(id) on delete cascade,
  kelas_id uuid references kelas(id) on delete cascade,
  primary key (ujian_id, kelas_id)
);

create table ujian_soal (
  ujian_id uuid references ujian(id) on delete cascade,
  soal_id uuid references soal(id) on delete cascade,
  urutan int not null,
  bobot numeric default 1,
  primary key (ujian_id, soal_id)
);

create table peserta (
  id uuid primary key default gen_random_uuid(),
  ujian_id uuid references ujian(id) on delete cascade,
  siswa_id uuid references siswa(id) on delete cascade,
  device_id text,
  token_sesi text unique,
  status text default 'menunggu' check (status in ('menunggu', 'mengerjakan', 'terkunci', 'selesai')),
  disetujui boolean default false,
  mulai_at timestamptz,
  selesai_at timestamptz,
  jumlah_pelanggaran int default 0,
  tambahan_waktu int default 0,
  created_at timestamptz default now(),
  unique (ujian_id, siswa_id)
);

create table jawaban (
  id uuid primary key default gen_random_uuid(),
  peserta_id uuid references peserta(id) on delete cascade,
  soal_id uuid references soal(id) on delete cascade,
  isi text,
  ragu_ragu boolean default false,
  diterima_at timestamptz default now(),
  skor numeric,
  unique (peserta_id, soal_id)
);

create table pelanggaran (
  id uuid primary key default gen_random_uuid(),
  peserta_id uuid references peserta(id) on delete cascade,
  jenis text not null,
  waktu_server timestamptz default now(),
  keterangan text
);

create table kode_buka (
  id uuid primary key default gen_random_uuid(),
  peserta_id uuid references peserta(id) on delete cascade,
  kode text not null,
  dipakai boolean default false,
  kedaluwarsa_at timestamptz not null,
  created_at timestamptz default now()
);

create index idx_kelas_guru on kelas(guru_id);
create index idx_siswa_kelas on siswa(kelas_id);
create index idx_soal_guru on soal(guru_id);
create index idx_ujian_guru on ujian(guru_id);
create index idx_ujian_kode on ujian(kode);
create index idx_peserta_ujian on peserta(ujian_id);
create index idx_peserta_token on peserta(token_sesi);
create index idx_jawaban_peserta on jawaban(peserta_id);
create index idx_pelanggaran_peserta on pelanggaran(peserta_id);
