-- Profil guru dari login Google: Google mengirim nama di 'full_name' / 'name', bukan 'nama'.
-- Urutan: nama (form daftar) -> full_name -> name (Google) -> bagian depan email -> 'Guru'.
create or replace function buat_profil_guru()
returns trigger as $$
begin
  insert into guru (id, email, nama)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'nama'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1),
      'Guru'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.buat_profil_guru() from public, anon, authenticated;
