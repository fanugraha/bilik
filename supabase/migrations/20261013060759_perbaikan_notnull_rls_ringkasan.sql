-- ============================================================
-- 1. NOT NULL & default: created_at, boolean, angka
-- ============================================================
alter table public.guru      alter column created_at set not null;
alter table public.kelas     alter column created_at set not null;
alter table public.siswa     alter column created_at set not null;
alter table public.soal      alter column created_at set not null;
alter table public.ujian     alter column created_at set not null;
alter table public.bank_soal alter column created_at set not null;
alter table public.peserta   alter column created_at set not null;
alter table public.kode_buka alter column created_at set not null;
alter table public.jawaban   alter column diterima_at set not null;

alter table public.ujian     alter column status set not null;
alter table public.ujian     alter column acak_soal set not null;
alter table public.ujian     alter column acak_opsi set not null;
alter table public.ujian     alter column batas_pelanggaran set not null;
alter table public.peserta   alter column status set not null;
alter table public.peserta   alter column disetujui set not null;
alter table public.peserta   alter column jumlah_pelanggaran set not null;
alter table public.peserta   alter column tambahan_waktu set not null;
alter table public.jawaban   alter column ragu_ragu set not null;
alter table public.kode_buka alter column dipakai set not null;
alter table public.soal      alter column bobot set not null;
alter table public.ujian_soal alter column bobot set not null;

-- ============================================================
-- 2. Kode buka: satu kode aktif per peserta
-- ============================================================
create unique index kode_buka_aktif_per_peserta on public.kode_buka (peserta_id) where dipakai = false;

create or replace function public.generate_kode_buka(p_peserta_id uuid)
returns text language plpgsql security definer set search_path = 'public' as $function$
declare
  kode_baru text;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role'
    and not exists (
      select 1 from peserta p
      join ujian u on u.id = p.ujian_id
      where p.id = p_peserta_id and u.guru_id = auth.uid()
    ) then
    raise exception 'Peserta tidak ditemukan' using errcode = '42501';
  end if;

  -- Kode lama yang belum dipakai dimatikan agar hanya ada satu kode aktif
  update kode_buka set dipakai = true where peserta_id = p_peserta_id and dipakai = false;

  kode_baru := generate_kode_ujian();
  insert into kode_buka (peserta_id, kode, kedaluwarsa_at)
  values (p_peserta_id, kode_baru, now() + interval '5 minutes');
  return kode_baru;
end;
$function$;

-- ============================================================
-- 3. RLS: bungkus auth.uid()/current_setting() dengan (select ...) untuk performa
-- ============================================================
drop policy "Guru kelola bank soalnya" on public.bank_soal;
create policy "Guru kelola bank soalnya" on public.bank_soal for all
  using (guru_id = (select auth.uid()));

drop policy "Guru lihat kelasnya" on public.kelas;
create policy "Guru lihat kelasnya" on public.kelas for all
  using (guru_id = (select auth.uid()));

drop policy "Guru lihat soalnya" on public.soal;
create policy "Guru lihat soalnya" on public.soal for all
  using (guru_id = (select auth.uid()));

drop policy "Guru lihat ujiannya" on public.ujian;
create policy "Guru lihat ujiannya" on public.ujian for all
  using (guru_id = (select auth.uid()));

drop policy "Guru lihat diri sendiri" on public.guru;
create policy "Guru lihat diri sendiri" on public.guru for select
  using ((select auth.uid()) = id);
drop policy "Guru edit diri sendiri" on public.guru;
create policy "Guru edit diri sendiri" on public.guru for update
  using ((select auth.uid()) = id);
drop policy "Guru hapus diri sendiri" on public.guru;
create policy "Guru hapus diri sendiri" on public.guru for delete
  using ((select auth.uid()) = id);
drop policy "Guru bisa daftar" on public.guru;
create policy "Guru bisa daftar" on public.guru for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy "Guru lihat peserta ujiannya" on public.peserta;
create policy "Guru lihat peserta ujiannya" on public.peserta for all
  using (exists (select 1 from public.ujian where ujian.id = peserta.ujian_id and ujian.guru_id = (select auth.uid())));
drop policy "Siswa lihat dirinya sendiri" on public.peserta;
create policy "Siswa lihat dirinya sendiri" on public.peserta for select
  using (token_sesi = (select current_setting('request.jwt.claims', true)::json ->> 'token_sesi'));

drop policy "Guru lihat siswa kelasnya" on public.siswa;
create policy "Guru lihat siswa kelasnya" on public.siswa for all
  using (exists (select 1 from public.kelas where kelas.id = siswa.kelas_id and kelas.guru_id = (select auth.uid())));

drop policy "Guru lihat jawaban ujiannya" on public.jawaban;
create policy "Guru lihat jawaban ujiannya" on public.jawaban for all
  using (exists (select 1 from public.peserta p join public.ujian u on u.id = p.ujian_id
                 where p.id = jawaban.peserta_id and u.guru_id = (select auth.uid())));
drop policy "Siswa upsert jawaban sendiri" on public.jawaban;
create policy "Siswa upsert jawaban sendiri" on public.jawaban for insert
  with check (exists (select 1 from public.peserta
                      where peserta.id = jawaban.peserta_id
                        and peserta.token_sesi = (select current_setting('request.jwt.claims', true)::json ->> 'token_sesi')));

drop policy "Guru lihat pelanggaran ujiannya" on public.pelanggaran;
create policy "Guru lihat pelanggaran ujiannya" on public.pelanggaran for select
  using (exists (select 1 from public.peserta p join public.ujian u on u.id = p.ujian_id
                 where p.id = pelanggaran.peserta_id and u.guru_id = (select auth.uid())));
drop policy "Siswa laporkan pelanggaran sendiri" on public.pelanggaran;
create policy "Siswa laporkan pelanggaran sendiri" on public.pelanggaran for insert
  with check (exists (select 1 from public.peserta
                      where peserta.id = pelanggaran.peserta_id
                        and peserta.token_sesi = (select current_setting('request.jwt.claims', true)::json ->> 'token_sesi')));

drop policy "Guru kelola kode buka ujiannya" on public.kode_buka;
create policy "Guru kelola kode buka ujiannya" on public.kode_buka for all
  using (exists (select 1 from public.peserta p join public.ujian u on u.id = p.ujian_id
                 where p.id = kode_buka.peserta_id and u.guru_id = (select auth.uid())));

drop policy "Guru kelola kelas ujiannya" on public.ujian_kelas;
create policy "Guru kelola kelas ujiannya" on public.ujian_kelas for all
  using (exists (select 1 from public.ujian where ujian.id = ujian_kelas.ujian_id and ujian.guru_id = (select auth.uid())))
  with check (
    exists (select 1 from public.ujian where ujian.id = ujian_kelas.ujian_id and ujian.guru_id = (select auth.uid()))
    and exists (select 1 from public.kelas where kelas.id = ujian_kelas.kelas_id and kelas.guru_id = (select auth.uid()))
  );

drop policy "Guru kelola soal ujiannya" on public.ujian_soal;
create policy "Guru kelola soal ujiannya" on public.ujian_soal for all
  using (exists (select 1 from public.ujian where ujian.id = ujian_soal.ujian_id and ujian.guru_id = (select auth.uid())))
  with check (
    exists (select 1 from public.ujian where ujian.id = ujian_soal.ujian_id and ujian.guru_id = (select auth.uid()))
    and exists (select 1 from public.soal where soal.id = ujian_soal.soal_id and soal.guru_id = (select auth.uid()))
  );

-- ============================================================
-- 4. RPC ringkasan_guru: ganti 5 query CTA jadi 1
-- ============================================================
create or replace function public.ringkasan_guru()
returns table (
  jumlah_kelas int,
  jumlah_siswa int,
  jumlah_soal int,
  jumlah_ujian int,
  bank_pertama_id uuid,
  kelas_tanpa_siswa_id uuid
)
language sql stable security invoker set search_path = '' as $function$
  select
    (select count(*)::int from public.kelas where guru_id = (select auth.uid())),
    (select count(*)::int from public.siswa s join public.kelas k on k.id = s.kelas_id where k.guru_id = (select auth.uid())),
    (select count(*)::int from public.soal where guru_id = (select auth.uid())),
    (select count(*)::int from public.ujian where guru_id = (select auth.uid())),
    (select id from public.bank_soal where guru_id = (select auth.uid()) order by created_at asc limit 1),
    (select k.id from public.kelas k
      where k.guru_id = (select auth.uid())
        and not exists (select 1 from public.siswa s where s.kelas_id = k.id)
      order by k.nama asc limit 1)
$function$;

revoke execute on function public.ringkasan_guru() from public, anon;
grant execute on function public.ringkasan_guru() to authenticated;
