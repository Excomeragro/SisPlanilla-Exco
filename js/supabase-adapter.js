// Adaptador inicial para la siguiente etapa.
// Actualmente la app usa localStorage. Este archivo queda preparado para
// conectar empleados, planillas, historial y boletas con Supabase.

window.SisPlanillaSupabaseAdapter = {
  isEnabled() {
    return !!(window.SISPLANILLA_SUPABASE && window.SISPLANILLA_SUPABASE.enabled);
  },

  async loadAll() {
    throw new Error('Supabase todavía no está conectado. Usar localStorage por ahora.');
  },

  async saveEmpleado(_empleado) {
    throw new Error('Pendiente: guardar empleado en Supabase.');
  },

  async savePlanilla(_planilla) {
    throw new Error('Pendiente: guardar planilla en Supabase.');
  },

  async savePago(_pago) {
    throw new Error('Pendiente: guardar pago histórico en Supabase.');
  },

  async saveBoleta(_boleta) {
    throw new Error('Pendiente: guardar boleta en Supabase.');
  },
};
