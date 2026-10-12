-- Perbaiki RLS guru: izinkan INSERT saat signup + UPDATE/DELETE diri sendiri

-- INSERT: setiap orang yang signup (auth.uid() akan diisi Supabase Auth)
create policy "Guru bisa daftar"
  on guru for insert
  with check (auth.uid()::text = id::text);

-- UPDATE & DELETE: guru edit/hapus akunnya sendiri
create policy "Guru edit diri sendiri"
  on guru for update
  using (auth.uid()::text = id::text);

create policy "Guru hapus diri sendiri"
  on guru for delete
  using (auth.uid()::text = id::text);
