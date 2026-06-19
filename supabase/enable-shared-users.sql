-- Ejecutar una vez en Supabase > SQL Editor.
-- Todos los usuarios autenticados de SisPlanilla comparten la misma información.

create table if not exists public.sisplanilla_company_state (
  workspace_id text primary key default 'exco',
  data jsonb not null default '{"empleados":[],"planillas":[],"historialPagos":[],"boletas":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint sisplanilla_company_workspace check (workspace_id = 'exco')
);

-- Conserva el estado más reciente del esquema anterior, si lo hubiera.
do $$
begin
  if to_regclass('public.sisplanilla_state') is not null then
    execute $copy$
      insert into public.sisplanilla_company_state (workspace_id, data, updated_at)
      select 'exco', data, updated_at
      from public.sisplanilla_state
      order by updated_at desc
      limit 1
      on conflict (workspace_id) do nothing
    $copy$;
  end if;
end $$;

alter table public.sisplanilla_company_state enable row level security;

drop policy if exists "company_state_select" on public.sisplanilla_company_state;
drop policy if exists "company_state_insert" on public.sisplanilla_company_state;
drop policy if exists "company_state_update" on public.sisplanilla_company_state;

create policy "company_state_select"
on public.sisplanilla_company_state for select
to authenticated
using (workspace_id = 'exco');

create policy "company_state_insert"
on public.sisplanilla_company_state for insert
to authenticated
with check (workspace_id = 'exco');

create policy "company_state_update"
on public.sisplanilla_company_state for update
to authenticated
using (workspace_id = 'exco')
with check (workspace_id = 'exco');

revoke all on table public.sisplanilla_company_state from anon;
grant select, insert, update on table public.sisplanilla_company_state to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sisplanilla_company_state'
  ) then
    alter publication supabase_realtime add table public.sisplanilla_company_state;
  end if;
end $$;
