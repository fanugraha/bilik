-- Perbaikan temuan audit 2026-10-12: RLS 2 tabel penghubung + kunci fungsi SQL

-- 1. Nyalakan RLS di tabel penghubung (ikut pola tabel lain: guru kelola miliknya)
alter table ujian_kelas enable row level security;

create policy "Guru kelola kelas ujiannya"
  on ujian_kelas for all
  using (
    exists (
      select 1 from ujian where ujian.id = ujian_kelas.ujian_id and ujian.guru_id = auth.uid()
    )
  );

alter table ujian_soal enable row level security;

create policy "Guru kelola soal ujiannya"
  on ujian_soal for all
  using (
    exists (
      select 1 from ujian where ujian.id = ujian_soal.ujian_id and ujian.guru_id = auth.uid()
    )
  );

-- 2. Kunci search_path fungsi (cegah schema hijack)
alter function public.hitung_skor_pg(uuid, uuid) set search_path = public;
alter function public.generate_kode_ujian() set search_path = public;
alter function public.generate_kode_buka(uuid) set search_path = public;

-- 3. Cabut akses anon ke fungsi (siswa tidak boleh panggil langsung;
-- guru pakai peran authenticated, tetap bisa)
revoke execute on function public.hitung_skor_pg(uuid, uuid) from anon;
revoke execute on function public.generate_kode_ujian() from anon;
revoke execute on function public.generate_kode_buka(uuid) from anon;
