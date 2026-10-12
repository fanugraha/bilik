-- RLS untuk tabel guru (PRD 7: auth guru)
alter table guru enable row level security;

create policy "Guru lihat diri sendiri"
  on guru for select
  using (auth.uid()::text = id::text);

-- Kelas: guru hanya lihat miliknya
alter table kelas enable row level security;

create policy "Guru lihat kelasnya"
  on kelas for all
  using (guru_id = auth.uid());

-- Siswa: guru lihat siswa di kelasnya
alter table siswa enable row level security;

create policy "Guru lihat siswa kelasnya"
  on siswa for all
  using (
    exists (
      select 1 from kelas where kelas.id = siswa.kelas_id and kelas.guru_id = auth.uid()
    )
  );

-- Soal: guru hanya lihat miliknya; KUNCI & PEDOMAN tidak dikirim ke app siswa
alter table soal enable row level security;

create policy "Guru lihat soalnya"
  on soal for all
  using (guru_id = auth.uid());

-- Ujian: guru lihat miliknya
alter table ujian enable row level security;

create policy "Guru lihat ujiannya"
  on ujian for all
  using (guru_id = auth.uid());

-- Peserta: siswa (anon) hanya lihat dirinya lewat token_sesi
alter table peserta enable row level security;

create policy "Guru lihat peserta ujiannya"
  on peserta for all
  using (
    exists (
      select 1 from ujian where ujian.id = peserta.ujian_id and ujian.guru_id = auth.uid()
    )
  );

create policy "Siswa lihat dirinya sendiri"
  on peserta for select
  using (token_sesi = current_setting('request.jwt.claims', true)::json->>'token_sesi');

-- Jawaban: siswa upsert miliknya; skor HANYA guru yang isi
alter table jawaban enable row level security;

create policy "Guru lihat jawaban ujiannya"
  on jawaban for all
  using (
    exists (
      select 1 from peserta p
      join ujian u on u.id = p.ujian_id
      where p.id = jawaban.peserta_id and u.guru_id = auth.uid()
    )
  );

create policy "Siswa upsert jawaban sendiri"
  on jawaban for insert
  with check (
    exists (
      select 1 from peserta
      where peserta.id = jawaban.peserta_id
      and peserta.token_sesi = current_setting('request.jwt.claims', true)::json->>'token_sesi'
    )
  );

-- Pelanggaran: siswa insert miliknya; guru lihat semua peserta ujiannya
alter table pelanggaran enable row level security;

create policy "Guru lihat pelanggaran ujiannya"
  on pelanggaran for select
  using (
    exists (
      select 1 from peserta p
      join ujian u on u.id = p.ujian_id
      where p.id = pelanggaran.peserta_id and u.guru_id = auth.uid()
    )
  );

create policy "Siswa laporkan pelanggaran sendiri"
  on pelanggaran for insert
  with check (
    exists (
      select 1 from peserta
      where peserta.id = pelanggaran.peserta_id
      and peserta.token_sesi = current_setting('request.jwt.claims', true)::json->>'token_sesi'
    )
  );

-- Kode buka: hanya guru yang buat & lihat
alter table kode_buka enable row level security;

create policy "Guru kelola kode buka ujiannya"
  on kode_buka for all
  using (
    exists (
      select 1 from peserta p
      join ujian u on u.id = p.ujian_id
      where p.id = kode_buka.peserta_id and u.guru_id = auth.uid()
    )
  );
