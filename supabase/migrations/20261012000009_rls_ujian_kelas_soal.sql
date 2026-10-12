-- RLS untuk tabel ujian_kelas & ujian_soal (relasi many-to-many)
-- Guru hanya kelola ujiannya sendiri

alter table ujian_kelas enable row level security;

create policy "Guru kelola ujian_kelas miliknya"
  on ujian_kelas for all
  using (
    exists (
      select 1 from ujian where ujian.id = ujian_kelas.ujian_id and ujian.guru_id = auth.uid()
    )
  );

alter table ujian_soal enable row level security;

create policy "Guru kelola ujian_soal miliknya"
  on ujian_soal for all
  using (
    exists (
      select 1 from ujian where ujian.id = ujian_soal.ujian_id and ujian.guru_id = auth.uid()
    )
  );
