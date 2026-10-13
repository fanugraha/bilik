-- Bank soal: kumpulan soal bernama milik guru, agar soal bisa dikelompokkan
-- (mis. per mapel/kelas) dan dipakai ulang saat menyusun ujian.
-- Setiap soal punya paling banyak satu bank (bank_soal_id).

create table bank_soal (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid references guru(id) on delete cascade,
  nama text not null,
  created_at timestamptz default now()
);

create index idx_bank_soal_guru on bank_soal(guru_id);

-- Soal boleh tanpa bank (bank_soal_id null). Menghapus bank tidak menghapus soalnya.
alter table soal add column bank_soal_id uuid references bank_soal(id) on delete set null;

create index idx_soal_bank on soal(bank_soal_id);

-- RLS: guru hanya kelola bank soalnya sendiri
alter table bank_soal enable row level security;

create policy "Guru kelola bank soalnya"
  on bank_soal for all
  using (guru_id = auth.uid());
