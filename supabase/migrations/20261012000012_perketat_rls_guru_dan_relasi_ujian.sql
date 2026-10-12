-- Temuan audit 2026-10-12:
-- (a) Policy "Guru bisa daftar" with check (true) membuat siapa pun (anon) bisa
--     menyisipkan baris guru palsu / menyerobot email. Profil guru kini dibuat
--     trigger di auth.users, jadi insert dari klien cukup untuk baris milik sendiri.
-- (b) ujian_kelas & ujian_soal hanya mengecek pemilik ujian; kelas/soal milik
--     guru lain bisa ditautkan. WITH CHECK kini juga mengecek pemilik kelas/soal.

-- (a) Profil guru otomatis saat akun auth dibuat
create or replace function buat_profil_guru()
returns trigger as $$
begin
  insert into guru (id, email, nama)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nama'), ''), split_part(new.email, '@', 1), 'Guru')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.buat_profil_guru() from public, anon, authenticated;

drop trigger if exists buat_profil_guru_setelah_daftar on auth.users;
create trigger buat_profil_guru_setelah_daftar
  after insert on auth.users
  for each row execute function buat_profil_guru();

drop policy if exists "Guru bisa daftar" on guru;
create policy "Guru bisa daftar"
  on guru for insert
  to authenticated
  with check (auth.uid() = id);

-- (b) Relasi ujian: satu policy per tabel (policy duplikat dari migrasi 004 & 009 digabung)
drop policy if exists "Guru kelola kelas ujiannya" on ujian_kelas;
drop policy if exists "Guru kelola ujian_kelas miliknya" on ujian_kelas;
create policy "Guru kelola kelas ujiannya"
  on ujian_kelas for all
  using (
    exists (select 1 from ujian where ujian.id = ujian_kelas.ujian_id and ujian.guru_id = auth.uid())
  )
  with check (
    exists (select 1 from ujian where ujian.id = ujian_kelas.ujian_id and ujian.guru_id = auth.uid())
    and exists (select 1 from kelas where kelas.id = ujian_kelas.kelas_id and kelas.guru_id = auth.uid())
  );

drop policy if exists "Guru kelola soal ujiannya" on ujian_soal;
drop policy if exists "Guru kelola ujian_soal miliknya" on ujian_soal;
create policy "Guru kelola soal ujiannya"
  on ujian_soal for all
  using (
    exists (select 1 from ujian where ujian.id = ujian_soal.ujian_id and ujian.guru_id = auth.uid())
  )
  with check (
    exists (select 1 from ujian where ujian.id = ujian_soal.ujian_id and ujian.guru_id = auth.uid())
    and exists (select 1 from soal where soal.id = ujian_soal.soal_id and soal.guru_id = auth.uid())
  );
