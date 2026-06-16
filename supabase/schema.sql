-- Esquema inicial para SisPlanilla Exco en Supabase.
-- Ejecutar en Supabase SQL Editor cuando se vaya a activar el guardado en nube.

create table if not exists empleados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  dui text,
  telefono text,
  direccion text,
  fecha_ingreso date,
  cargo text,
  departamento text,
  salario_hora numeric(10, 2) not null default 0,
  tipo_pago text default 'Semanal',
  afp_institucion text default 'Confía',
  contacto_nombre text,
  contacto_telefono text,
  contacto_parentesco text,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  fecha_salida date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists planillas (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid references empleados(id),
  empleado_snapshot jsonb not null default '{}'::jsonb,
  fecha_registro date not null default current_date,
  fecha_inicio date not null,
  fecha_fin date not null,
  h_ordinarias numeric(10, 2) not null default 0,
  extra_dia text,
  h_extra numeric(10, 2) not null default 0,
  h_septimo numeric(10, 2) not null default 0,
  h_asueto numeric(10, 2) not null default 0,
  otros_ingresos numeric(10, 2) not null default 0,
  prestamos numeric(10, 2) not null default 0,
  otros_descuentos numeric(10, 2) not null default 0,
  aplicar_renta boolean not null default false,
  calc jsonb not null default '{}'::jsonb,
  boleta_generada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists historial_pagos (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid references empleados(id),
  empleado text not null,
  fecha date not null default current_date,
  periodo text,
  devengado numeric(10, 2) not null default 0,
  isss numeric(10, 2) not null default 0,
  afp numeric(10, 2) not null default 0,
  renta numeric(10, 2) not null default 0,
  otros_descuentos numeric(10, 2) not null default 0,
  descuentos numeric(10, 2) not null default 0,
  neto numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists boletas (
  id uuid primary key default gen_random_uuid(),
  planilla_id uuid references planillas(id),
  empleado_id uuid references empleados(id),
  empleado text not null,
  fecha date not null default current_date,
  periodo text,
  devengado numeric(10, 2) not null default 0,
  descuentos numeric(10, 2) not null default 0,
  neto numeric(10, 2) not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
