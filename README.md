# SisPlanilla Exco

Sistema local de control de empleados, planillas, boletas e historial de pagos.

## Archivo principal

Usa `index.html`.

Ese es el archivo que debe abrirse en el navegador y el que GitHub Pages usará automáticamente cuando se suba el proyecto.

## Estructura

- `index.html`: entrada principal del sistema.
- `css/styles.css`: estilos de la interfaz y boleta impresa.
- `js/app.js`: lógica principal del sistema.
- `js/initial-data.js`: datos iniciales embebidos para modo local.
- `js/supabase-adapter.js`: conexión, acceso y sincronización con Supabase.
- `js/supabase-config.public.js`: URL y llave pública del proyecto Supabase.
- `js/vendor/supabase.min.js`: librería local de Supabase para evitar bloqueos del navegador.
- `assets/`: logo e icono.
- `supabase/schema.sql`: tablas iniciales para Supabase.
- `legacy/SisPlanilla Exco.full.html`: respaldo del archivo único anterior.

## Uso local

Abre `index.html` en el navegador.

Los datos siempre se guardan en el navegador. Al conectar Supabase también se guardan automáticamente en la nube y se actualizan en los equipos que usen la misma cuenta.

## Subir actualizaciones a GitHub

Abre `SUBIR_A_GITHUB.bat`. El archivo guarda los cambios y los sube a la rama `main` del repositorio de SisPlanilla Exco. La primera vez, GitHub puede solicitar iniciar sesión.

## Activar Supabase

1. Crear un proyecto en Supabase.
2. Abrir `SQL Editor`, pegar todo el contenido de `supabase/schema.sql` y ejecutarlo.
3. Abrir `Project Settings > API` y copiar la URL del proyecto y la llave `anon` o `publishable`.
4. Colocar esos dos valores en `js/supabase-config.public.js` y cambiar `enabled` a `true`.
5. Subir la actualización con `SUBIR_A_GITHUB.bat`.
6. En SisPlanilla, abrir `Ajustes > Nube Supabase` y crear una cuenta o iniciar sesión.

La llave `anon` es pública y se protege con Auth y RLS. Nunca colocar una llave `service_role` en el proyecto ni en GitHub.

## Usuarios de SisPlanilla

- Ejecutar `supabase/enable-shared-users.sql` en el SQL Editor para activar la información compartida.
- El acceso usa un nombre de usuario; internamente Supabase lo guarda como `usuario@sisplanilla.local`.
- El primer usuario se crea en `Authentication > Users` con `Auto Confirm User` activado.
- Desplegar `supabase/functions/create-user/index.ts` como la Edge Function `create-user`.
- Después, cualquier usuario conectado puede agregar otros usuarios desde `Ajustes > Nube Supabase`.
