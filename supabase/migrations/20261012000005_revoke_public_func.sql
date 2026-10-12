-- Cabut akses PUBLIC ke fungsi (perbaikan lanjutan 2026-10-12)
revoke execute on function public.hitung_skor_pg(uuid, uuid) from public;
revoke execute on function public.generate_kode_buka(uuid) from public;
revoke execute on function public.generate_kode_ujian() from public;
grant execute on function public.hitung_skor_pg(uuid, uuid) to authenticated, service_role;
grant execute on function public.generate_kode_buka(uuid) to authenticated, service_role;
grant execute on function public.generate_kode_ujian() to authenticated, service_role;
