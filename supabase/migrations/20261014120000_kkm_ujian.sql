-- KKM (nilai lulus) per ujian. Dipakai halaman nilai untuk menandai siswa lulus/remedial.
-- Bawaan 70; aman untuk baris lama karena kolom not null punya default.
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ujian' and column_name = 'kkm'
  ) then
    alter table public.ujian
      add column kkm int not null default 70
      constraint ujian_kkm_rentang check (kkm between 0 and 100);
  end if;
end $$;
