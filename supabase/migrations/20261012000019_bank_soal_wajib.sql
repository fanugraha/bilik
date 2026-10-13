-- Bank soal jadi "folder" wajib: guru membuat bank dulu, lalu menulis soal di dalamnya.
-- (a) bank punya mapel opsional, dipakai sebagai keterangan dan isian awal ujian
-- (b) soal lama tanpa bank dipindah ke bank "Umum" milik gurunya
-- (c) soal.bank_soal_id wajib; bank yang masih berisi soal tidak bisa dihapus

alter table bank_soal add column if not exists mapel text;

insert into bank_soal (guru_id, nama)
select distinct soal.guru_id, 'Umum'
from soal
where soal.bank_soal_id is null
  and soal.guru_id is not null
  and not exists (
    select 1 from bank_soal where bank_soal.guru_id = soal.guru_id and bank_soal.nama = 'Umum'
  );

update soal
set bank_soal_id = (
  select bank_soal.id from bank_soal
  where bank_soal.guru_id = soal.guru_id and bank_soal.nama = 'Umum'
  order by bank_soal.created_at
  limit 1
)
where bank_soal_id is null and guru_id is not null;

alter table soal alter column bank_soal_id set not null;

-- Menghapus bank yang masih berisi soal ditolak; guru memindahkan atau menghapus soalnya dulu
alter table soal drop constraint if exists soal_bank_soal_id_fkey;
alter table soal
  add constraint soal_bank_soal_id_fkey foreign key (bank_soal_id) references bank_soal(id) on delete restrict;
