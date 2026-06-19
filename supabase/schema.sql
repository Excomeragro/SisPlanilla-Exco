-- SisPlanilla Exco: estado privado por usuario y sincronización en tiempo real.
-- Ejecutar completo en Supabase > SQL Editor.

create table if not exists public.sisplanilla_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"empleados":[],"planillas":[],"historialPagos":[],"boletas":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.sisplanilla_state enable row level security;

drop policy if exists "sisplanilla_select_own" on public.sisplanilla_state;
drop policy if exists "sisplanilla_insert_own" on public.sisplanilla_state;
drop policy if exists "sisplanilla_update_own" on public.sisplanilla_state;
drop policy if exists "sisplanilla_delete_own" on public.sisplanilla_state;

create policy "sisplanilla_select_own"
on public.sisplanilla_state for select
to authenticated
using (auth.uid() = user_id);

create policy "sisplanilla_insert_own"
on public.sisplanilla_state for insert
to authenticated
with check (auth.uid() = user_id);

create policy "sisplanilla_update_own"
on public.sisplanilla_state for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "sisplanilla_delete_own"
on public.sisplanilla_state for delete
to authenticated
using (auth.uid() = user_id);

revoke all on table public.sisplanilla_state from anon;
grant select, insert, update, delete on table public.sisplanilla_state to authenticated;

-- Si se ejecutó el esquema anterior, cerrar su acceso hasta migrarlo o eliminarlo.
do $$
declare
  old_table text;
begin
  foreach old_table in array array['empleados','planillas','historial_pagos','boletas'] loop
    if to_regclass('public.' || old_table) is not null then
      execute format('alter table public.%I enable row level security', old_table);
      execute format('revoke all on table public.%I from anon, authenticated', old_table);
    end if;
  end loop;
end $$;

-- Activar la tabla en Realtime una sola vez.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sisplanilla_state'
  ) then
    alter publication supabase_realtime add table public.sisplanilla_state;
  end if;
end $$;

-- Base compartida por todos los usuarios autorizados de SisPlanilla Exco.
create table if not exists public.sisplanilla_company_state (
  workspace_id text primary key default 'exco',
  data jsonb not null default '{"empleados":[],"planillas":[],"historialPagos":[],"boletas":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint sisplanilla_company_workspace check (workspace_id = 'exco')
);

alter table public.sisplanilla_company_state enable row level security;

drop policy if exists "company_state_select" on public.sisplanilla_company_state;
drop policy if exists "company_state_insert" on public.sisplanilla_company_state;
drop policy if exists "company_state_update" on public.sisplanilla_company_state;

create policy "company_state_select" on public.sisplanilla_company_state
for select to authenticated using (workspace_id = 'exco');

create policy "company_state_insert" on public.sisplanilla_company_state
for insert to authenticated with check (workspace_id = 'exco');

create policy "company_state_update" on public.sisplanilla_company_state
for update to authenticated using (workspace_id = 'exco') with check (workspace_id = 'exco');

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
