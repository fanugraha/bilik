-- Izinkan pendaftaran guru tanpa harus login dulu (sebelum punya sesi)
drop policy if exists "Guru bisa daftar" on guru;
create policy "Guru bisa daftar"
  on guru for insert
  with check (true);
