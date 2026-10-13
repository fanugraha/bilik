-- Perbaikan lint: kunci search_path fungsi + index untuk foreign key mapel_alias.

alter function public.normal_mapel(text) set search_path = '';
alter function public.set_updated_at() set search_path = '';

-- ditulis ulang dengan nama skema lengkap agar aman dengan search_path kosong
create or replace function public.selaraskan_mapel()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_alias text := public.normal_mapel(new.mapel);
  v_id uuid;
begin
  if v_alias = '' then
    new.mapel_id := null;
    return new;
  end if;
  select mapel_id into v_id from public.mapel_alias where alias = v_alias;
  if v_id is null then
    insert into public.mapel (nama, slug) values (btrim(new.mapel), v_alias) on conflict (slug) do nothing;
    select id into v_id from public.mapel where slug = v_alias;
    insert into public.mapel_alias (alias, mapel_id) values (v_alias, v_id) on conflict (alias) do nothing;
  end if;
  new.mapel_id := v_id;
  return new;
end;
$$;

create index idx_mapel_alias_mapel on public.mapel_alias(mapel_id);
