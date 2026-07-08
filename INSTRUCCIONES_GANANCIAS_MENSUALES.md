# 📊 Nuevo Módulo: Ganancias Mensuales

## ¿Qué es?
Una nueva sección en SisPlanilla Exco que te permite visualizar el historial completo de **ganancias netas mensuales de todos los empleados** en una sola tabla, mostrando:
- Período de cada mes (de qué fecha a qué fecha se pagó)
- Neto ganado por mes para cada empleado
- Totales mensuales por mes
- Filtros para búsqueda avanzada

## ¿Dónde está?
En el menú lateral, bajo "Historial laboral", encontrarás el nuevo botón:
👉 **"Ganancias mensuales"**

## Características

### 📋 Filtros disponibles:
- **Año**: Selecciona el año a consultar (2020-2030)
- **Mes**: Filtra por un mes específico o ve todos los meses
- **Estado**: Filtra por empleados activos, inactivos o todos
- **Búsqueda**: Busca por nombre o DUI del empleado

### 📥 Exportación e impresión:
- **Exportar a Excel**: Descarga los datos en formato CSV para editar en Excel
- **Imprimir**: Genera un reporte imprimible con toda la información

## Cómo usar

### 1. **Visualizar todas las ganancias mensuales**
   - Ve a "Ganancias mensuales"
   - Por defecto muestra el año actual
   - Las columnas son los meses (Enero, Febrero, etc.)
   - Las filas son los empleados
   - Cada celda muestra el neto ganado ese mes

### 2. **Filtrar por período específico**
   - Selecciona el **Año** (ej: 2026)
   - Selecciona el **Mes** (ej: Junio)
   - Haz clic en cualquier celda con dinero para ver el detalle de qué semanas se incluyen

### 3. **Buscar un empleado específico**
   - Usa la búsqueda para encontrar por nombre o DUI
   - Verás solo los meses en que trabajó ese empleado

### 4. **Exportar datos a Excel**
   - Ajusta los filtros como desees
   - Haz clic en "Exportar a Excel"
   - Se descargará un archivo CSV que puedes abrir en Excel, Google Sheets, etc.

### 5. **Imprimir reporte**
   - Configura los filtros
   - Haz clic en "Imprimir"
   - Se abrirá una nueva ventana con el reporte listo para imprimir

## Ejemplo de uso

**Situación**: Quieres ver cuánto ganó "Jorge Alfaro" en Junio de 2026

1. Ve a "Ganancias mensuales"
2. Deja el año en 2026
3. Selecciona mes "Junio"
4. En la búsqueda escribe "Jorge" o "Alfaro"
5. Verás a Jorge con sus ganancias netas de Junio
6. Si quieres ver el detalle de qué semanas se pagaron, hover sobre la cantidad

## Datos que se muestran

- **#**: Número de fila
- **Empleado**: Nombre completo
- **DUI**: Documento de identidad
- **Cargo**: Puesto de trabajo
- **Departamento**: Área asignada
- **Estado**: Activo 🟢 o Inactivo 🔴
- **Meses**: Columnas dinámicas que cambian según filtros
- **TOTAL NETO MENSUAL**: Fila de totales al pie de la tabla

## Notas importantes

✅ Los datos se calculan desde el **historial de pagos** generado en planillas  
✅ Solo se muestran empleados que tienen al menos un pago registrado  
✅ Los montos son **NETO** (ya descontados ISSS, AFP, Renta, etc.)  
✅ Si no aparece un empleado, es porque no tiene pagos registrados en ese período  
✅ Los cambios son automáticos según filtres - no necesita guardar  

## Solución de problemas

**P: No veo datos**  
R: Asegúrate de haber generado planillas con pagos. Los datos vienen del historial de pagos.

**P: ¿Por qué algunos empleados no aparecen?**  
R: Solo aparecen empleados que tienen al menos un pago en el período seleccionado.

**P: ¿Cómo cambio el rango de fechas?**  
R: Usa los filtros de Año y Mes. No hay rango personalizado, pero puedes exportar todos los datos.

---

**Creado**: 8 de julio de 2026  
**Versión**: 1.0
