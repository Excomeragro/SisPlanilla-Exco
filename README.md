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
- `js/supabase-adapter.js`: punto de conexión preparado para Supabase.
- `js/supabase-config.example.js`: plantilla de configuración de Supabase.
- `assets/`: logo e icono.
- `supabase/schema.sql`: tablas iniciales para Supabase.
- `legacy/SisPlanilla Exco.full.html`: respaldo del archivo único anterior.

## Uso local

Abre `index.html` en el navegador.

Por ahora los datos se guardan en el navegador con `localStorage`. Para respaldarlos, usa la pestaña `Ajustes` y exporta JSON.

## Subir actualizaciones a GitHub

Abre `SUBIR_A_GITHUB.bat`. El archivo guarda los cambios y los sube a la rama `main` del repositorio de SisPlanilla Exco. La primera vez, GitHub puede solicitar iniciar sesión.

## Preparación para Supabase

1. Crear un proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` en el SQL Editor.
3. Copiar `js/supabase-config.example.js` como `js/supabase-config.js`.
4. Colocar la URL y `anonKey` del proyecto.
5. Conectar `js/app.js` al adaptador de Supabase en la siguiente etapa.

`js/supabase-config.js` está en `.gitignore` para evitar subir llaves a GitHub.
