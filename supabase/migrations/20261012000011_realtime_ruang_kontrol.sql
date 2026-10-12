-- Ruang kontrol guru (PRD 5.1) butuh perubahan live dari tabel berikut.
-- Realtime tetap tunduk pada RLS: guru hanya menerima baris ujian miliknya.
alter publication supabase_realtime add table ujian, peserta, jawaban, pelanggaran;
