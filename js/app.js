const STORAGE_KEY = 'sisplanilla_sv_control_v2';
const INITIAL_DATA_VERSION = 'dui-2026-06-15';
const INITIAL_DATA_KEY = STORAGE_KEY + '_initial_data_version';
const EMPLOYEE_START_DATE = '2026-01-01';
const EMPLOYEE_START_DATE_MIGRATION_KEY = STORAGE_KEY + '_employee_start_date_2026';
const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const EXTRA_DIAS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
];
let state = cargarEstado();
let empleadoEditId = null;
let planillaEditId = null;

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function money(v) { return '$' + num(v).toFixed(2); }
function iso(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function todayIso() { return iso(new Date()); }
function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function estadoVacio() { return { empleados: [], planillas: [], historialPagos: [], boletas: [] }; }
function normalizarEstado(raw) {
  const base = estadoVacio();
  if (Array.isArray(raw)) raw = { planillas: raw };
  raw = raw && typeof raw === 'object' ? raw : {};
  base.empleados = (raw.empleados || []).map(normalizarEmpleado).filter(e => e.nombre);
  base.planillas = (raw.planillas || raw.planilla || []).map(normalizarPlanilla);
  base.historialPagos = (raw.historialPagos || []).map(normalizarPago);
  base.boletas = (raw.boletas || []).map(b => ({ ...b, id: b.id || uid() }));
  const migrados = base.planillas.map(p => p.empleadoSnapshot).filter(e => e && e.nombre);
  migrados.forEach(e => {
    if (!base.empleados.some(x => x.id === e.id || x.nombre.toLowerCase() === e.nombre.toLowerCase())) base.empleados.push(normalizarEmpleado(e));
  });
  return base;
}
function normalizarEmpleado(e) {
  return {
    id: e.id || uid(),
    nombre: (e.nombre || '').trim(),
    dui: (e.dui || '').trim(),
    telefono: (e.telefono || '').trim(),
    direccion: (e.direccion || '').trim(),
    fechaIngreso: e.fechaIngreso || e.fechaIni || '',
    cargo: (e.cargo || '').trim(),
    departamento: (e.departamento || e.area || e.planillaDep || '').trim(),
    salarioHora: num(e.salarioHora),
    tipoPago: e.tipoPago || 'Semanal',
    afpInstitucion: e.afpInstitucion || 'Confía',
    descontarIsss: e.descontarIsss !== false,
    descontarAfp: e.descontarAfp !== false,
    aplicarRenta: !!e.aplicarRenta,
    contactoNombre: (e.contactoNombre || '').trim(),
    contactoTelefono: (e.contactoTelefono || '').trim(),
    contactoParentesco: (e.contactoParentesco || e.parentesco || '').trim(),
    estado: e.estado === 'inactivo' ? 'inactivo' : 'activo',
    fechaSalida: e.fechaSalida || ''
  };
}
function normalizarPlanilla(p) {
  const emp = p.empleadoSnapshot || {};
  const extraDias = normalizarExtraDias(p.extraDias, p.extraDia || p.diaExtra, p.hExtra ?? p.hExtD);
  const hExtra = totalHorasExtra(extraDias);
  const aplicarIsss = p.aplicarIsss !== undefined ? p.aplicarIsss !== false : normalizarEmpleado(emp).descontarIsss;
  const aplicarAfp = p.aplicarAfp !== undefined ? p.aplicarAfp !== false : normalizarEmpleado(emp).descontarAfp;
  const calc = p.calc || calcularPago({ ...p, empleado: emp, extraDias, hExtra, aplicarIsss, aplicarAfp });
  return {
    id: p.id || uid(),
    empleadoId: p.empleadoId || emp.id || '',
    empleadoSnapshot: normalizarEmpleado({ ...emp, id: p.empleadoId || emp.id }),
    fechaRegistro: p.fechaRegistro || todayIso(),
    fechaInicio: p.fechaInicio || p.fechaIni || '',
    fechaFin: p.fechaFin || '',
    hOrdinarias: num(p.hOrdinarias ?? p.hOrdD),
    extraDias,
    extraDia: resumenDiasExtra(extraDias) || p.extraDia || p.diaExtra || '',
    hExtra,
    hSeptimo: num(p.hSeptimo ?? p.hDesc),
    hAsueto: num(p.hAsueto),
    otrosIngresos: num(p.otrosIngresos ?? p.otrosIng),
    prestamos: num(p.prestamos),
    otrosDescuentos: num(p.otrosDescuentos ?? p.otrosDesc),
    aplicarRenta: !!p.aplicarRenta,
    aplicarIsss,
    aplicarAfp,
    calc,
    boletaGenerada: !!p.boletaGenerada
  };
}
function normalizarPago(p) {
  return {
    id: p.id || uid(),
    planillaId: p.planillaId || '',
    empleadoId: p.empleadoId || '',
    empleado: p.empleado || '',
    fecha: p.fecha || todayIso(),
    periodo: p.periodo || '',
    devengado: num(p.devengado),
    isss: num(p.isss),
    afp: num(p.afp),
    renta: num(p.renta),
    otrosDescuentos: num(p.otrosDescuentos),
    descuentos: num(p.descuentos),
    neto: num(p.neto)
  };
}
function estadoTieneDatos(data) {
  return !!(data.empleados.length || data.planillas.length || data.historialPagos.length || data.boletas.length);
}
function empleadoKey(e) {
  const dui = String(e.dui || '').replace(/\D/g, '');
  return dui || String(e.nombre || '').trim().toLowerCase();
}
function fusionarEmpleados(base, extra) {
  const vistos = new Set(base.empleados.map(empleadoKey).filter(Boolean));
  extra.empleados.forEach(emp => {
    const key = empleadoKey(emp);
    if (key && !vistos.has(key)) {
      base.empleados.push(emp);
      vistos.add(key);
    }
  });
  return base;
}
function migrarFechaIngresoEmpleados(data) {
  try {
    if (localStorage.getItem(EMPLOYEE_START_DATE_MIGRATION_KEY) === EMPLOYEE_START_DATE) return data;
  } catch(e) {}
  data.empleados.forEach(emp => { emp.fechaIngreso = EMPLOYEE_START_DATE; });
  data.planillas.forEach(planilla => {
    if (planilla.empleadoSnapshot) planilla.empleadoSnapshot.fechaIngreso = EMPLOYEE_START_DATE;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(EMPLOYEE_START_DATE_MIGRATION_KEY, EMPLOYEE_START_DATE);
  } catch(e) {}
  return data;
}
function cargarEstado() {
  const embebido = normalizarEstado(typeof _datosIniciales !== 'undefined' ? _datosIniciales : {});
  let guardado = estadoVacio();
  try { guardado = normalizarEstado(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
  catch(e) { guardado = estadoVacio(); }
  if (estadoTieneDatos(guardado)) {
    if (estadoTieneDatos(embebido) && localStorage.getItem(INITIAL_DATA_KEY) !== INITIAL_DATA_VERSION) {
      guardado = fusionarEmpleados(guardado, embebido);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(guardado));
        localStorage.setItem(INITIAL_DATA_KEY, INITIAL_DATA_VERSION);
      } catch(e) {}
    }
    return migrarFechaIngresoEmpleados(guardado);
  }
  if (estadoTieneDatos(embebido)) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(embebido));
      localStorage.setItem(INITIAL_DATA_KEY, INITIAL_DATA_VERSION);
    } catch(e) {}
    return migrarFechaIngresoEmpleados(embebido);
  }
  return estadoVacio();
}
function guardarEstado(mostrarAviso = true) {
  sincronizarBoletasConPlanillas();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  if (mostrarAviso) document.getElementById('aviso-guardar').style.display = 'flex';
  renderTodo();
}
function generarHtmlConDatos(datos) {
  const json = JSON.stringify(datos).replace(/</g, '\\u003c');
  const script = '<script id="initial-data">var _datosIniciales = ' + json + '; /* __DATOS_INICIALES__ */<' + '/script>';
  return '<!DOCTYPE html>\n' + document.documentElement.outerHTML.replace(/<script id="initial-data">[\s\S]*?<\/script>/, script);
}
function guardarComoHTML() {
  const blob = new Blob([generarHtmlConDatos(state)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sisplanilla_' + todayIso() + '.html';
  a.click();
  URL.revokeObjectURL(url);
  document.getElementById('aviso-guardar').style.display = 'none';
  toast('HTML guardado con toda la información.');
}
function exportarJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sisplanilla_' + todayIso() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('JSON exportado.');
}
function importarJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        state = normalizarEstado(JSON.parse(ev.target.result));
        guardarEstado();
        toast('Datos importados correctamente.');
      } catch(err) { toast('Archivo JSON inválido.'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function ordenarPorNombre(empleados) {
  return [...empleados].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
}
function empleadosActivos() { return ordenarPorNombre(state.empleados.filter(e => e.estado === 'activo')); }
function empleadoPorId(id) { return state.empleados.find(e => e.id === id); }
function textoNormalizado(s) { return String(s || '').trim().toLowerCase(); }
function semanaPlanillaActual() {
  const inicio = document.getElementById('p-fecha-inicio')?.value || iso(lunesDeFecha(todayIso()));
  const fin = document.getElementById('p-fecha-fin')?.value || iso(new Date(fechaLocal(inicio).getTime() + 6 * 86400000));
  return { inicio, fin };
}
function empleadoAplicaSemana(emp) {
  if (!emp) return false;
  if (emp.estado === 'activo') return true;
  if (!emp.fechaSalida) return false;
  const { inicio } = semanaPlanillaActual();
  return fechaLocal(emp.fechaSalida) >= fechaLocal(inicio);
}
function empleadoDisponiblePlanilla(emp) {
  if (!empleadoAplicaSemana(emp)) return false;
  return !state.planillas.some(p => p.empleadoId === emp.id && p.id !== planillaEditId);
}
function empleadosDisponiblesPlanilla() {
  return ordenarPorNombre(state.empleados.filter(empleadoDisponiblePlanilla));
}
function periodoTexto(p) { return (p.fechaInicio || '?') + ' al ' + (p.fechaFin || '?'); }
function fechaLocal(value) { return value ? new Date(value + 'T00:00:00') : null; }
function boletaPlanillaData(b) { return b?.data || state.planillas.find(p => p.id === b?.planillaId); }
function finBoleta(b) {
  const data = boletaPlanillaData(b);
  if (data?.fechaFin) return data.fechaFin;
  const match = String(b?.periodo || '').match(/(\d{4}-\d{2}-\d{2})\s*$/);
  return match ? match[1] : '';
}
function planillaVigente(p) {
  const fin = fechaLocal(p?.fechaFin);
  return !fin || fin >= fechaLocal(todayIso());
}
function boletaVigente(b) {
  const fin = fechaLocal(finBoleta(b));
  return !fin || fin >= fechaLocal(todayIso());
}
function lunesDeFecha(value) {
  const d = value ? new Date(value + 'T00:00:00') : new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}
function pagoProporcionalSalida(emp) {
  if (!emp || emp.estado !== 'inactivo' || !emp.fechaSalida) return null;
  const { inicio, fin } = semanaPlanillaActual();
  const salida = fechaLocal(emp.fechaSalida);
  const lunes = fechaLocal(inicio);
  const domingo = fechaLocal(fin);
  const horasPorDia = [8, 8, 8, 8, 8, 4];
  let horasOrdinarias = 0;
  let diasTrabajados = 0;
  horasPorDia.forEach((horas, indice) => {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + indice);
    if (fecha < salida && fecha <= domingo) {
      horasOrdinarias += horas;
      diasTrabajados++;
    }
  });
  return {
    diasTrabajados,
    horasOrdinarias,
    horasSeptimo: diasTrabajados * 2,
    fechaSalida: emp.fechaSalida
  };
}
function sugerirRenta(devengado) {
  return red(num(devengado) * 0.10);
}
function calcularPago(d) {
  const salario = num(d.empleado?.salarioHora ?? d.salarioHora);
  const ord = num(d.hOrdinarias) * salario;
  const extra = num(d.hExtra) * salario * 2;
  const septimo = num(d.hSeptimo) * salario;
  const asueto = num(d.hAsueto) * salario * 2;
  const otrosIngresos = num(d.otrosIngresos);
  const devengado = ord + extra + septimo + asueto + otrosIngresos;
  const aplicarIsss = d.aplicarIsss !== undefined ? !!d.aplicarIsss : d.empleado?.descontarIsss !== false;
  const aplicarAfp = d.aplicarAfp !== undefined ? !!d.aplicarAfp : d.empleado?.descontarAfp !== false;
  const aplicarRenta = d.aplicarRenta !== undefined ? !!d.aplicarRenta : !!d.empleado?.aplicarRenta;
  const isss = aplicarIsss ? red(devengado * 0.03) : 0;
  const afp = aplicarAfp ? red(devengado * 0.0725) : 0;
  const rentaSugerida = sugerirRenta(devengado);
  const renta = aplicarRenta ? red(rentaSugerida) : 0;
  const prestamos = red(d.prestamos);
  const otrosDescuentos = red(d.otrosDescuentos);
  const descuentos = isss + afp + renta + prestamos + otrosDescuentos;
  return {
    ord: red(ord), extra: red(extra), septimo: red(septimo), asueto: red(asueto), otrosIngresos: red(otrosIngresos),
    devengado: red(devengado), isss, afp, rentaSugerida: red(rentaSugerida), renta,
    prestamos, otrosDescuentos, descuentos: red(descuentos), neto: red(devengado - descuentos)
  };
}
function red(v) { return Math.round(num(v) * 100) / 100; }
function extraDiasVacio() {
  return EXTRA_DIAS.reduce((acc, d) => ({ ...acc, [d.key]: 0 }), {});
}
function normalizarExtraDias(extraDias, diaAnterior, horasAnteriores) {
  const base = extraDiasVacio();
  if (extraDias && typeof extraDias === 'object') {
    EXTRA_DIAS.forEach(d => { base[d.key] = num(extraDias[d.key]); });
  } else if (num(horasAnteriores) > 0) {
    const dia = textoNormalizado(diaAnterior).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const found = EXTRA_DIAS.find(d => d.key === dia) || EXTRA_DIAS.find(d => d.key === 'viernes');
    base[found.key] = num(horasAnteriores);
  }
  return base;
}
function totalHorasExtra(extraDias) {
  return EXTRA_DIAS.reduce((sum, d) => sum + num(extraDias?.[d.key]), 0);
}
function resumenDiasExtra(extraDias) {
  const usados = EXTRA_DIAS
    .filter(d => num(extraDias?.[d.key]) > 0)
    .map(d => `${d.label} ${num(extraDias[d.key])}h`);
  return usados.join(', ');
}
function leerExtraDiasForm() {
  const extraDias = extraDiasVacio();
  EXTRA_DIAS.forEach(d => { extraDias[d.key] = num(document.getElementById('p-extra-' + d.key)?.value); });
  return extraDias;
}
function ponerNumeroReferencia(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = num(value) > 0 ? num(value) : '';
}
function cargarExtraDiasForm(extraDias) {
  const normalizados = normalizarExtraDias(extraDias);
  EXTRA_DIAS.forEach(d => {
    const el = document.getElementById('p-extra-' + d.key);
    if (el) el.value = num(normalizados[d.key]) > 0 ? normalizados[d.key] : '';
  });
}

function showTab(tab) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + tab).classList.add('active');
  document.querySelectorAll('.sidebar-btn[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'historial') renderHistorial();
  if (tab === 'boletas') { renderBoletasDisponibles(); renderBoletasGeneradas(); }
}
function toast(msg, dur = 2800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

function ajustarSemanaDesdeInicio() {
  const monday = lunesDeFecha(document.getElementById('p-fecha-inicio').value);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  document.getElementById('p-fecha-inicio').value = iso(monday);
  document.getElementById('p-fecha-fin').value = iso(sunday);
  renderSelects();
}
function cargarEmpleadoPlanilla() {
  const emp = empleadoPorId(document.getElementById('p-empleado').value);
  document.getElementById('p-dui').value = emp?.dui || '';
  document.getElementById('p-cargo').value = emp?.cargo || '';
  document.getElementById('p-departamento').value = emp?.departamento || '';
  document.getElementById('p-salario-hora').value = emp?.salarioHora || '';
  const proporcional = pagoProporcionalSalida(emp);
  const salidaInfo = document.getElementById('p-salida-info');
  if (salidaInfo) {
    salidaInfo.value = proporcional
      ? `${proporcional.diasTrabajados} día(s) · ${proporcional.horasOrdinarias} h ordinarias · ${proporcional.horasSeptimo} h séptimo`
      : (emp ? 'Semana completa' : '');
  }
  if (!planillaEditId && proporcional) {
    document.getElementById('p-h-ordinarias').value = proporcional.horasOrdinarias;
    document.getElementById('p-h-septimo').value = proporcional.horasSeptimo;
  }
  if (!planillaEditId) document.getElementById('p-aplicar-renta').checked = !!emp?.aplicarRenta;
  calcularPreviewPlanilla();
}
function buscarEmpleadoPlanilla() {
  const input = document.getElementById('p-empleado-buscar');
  const hidden = document.getElementById('p-empleado');
  const valor = textoNormalizado(input.value);
  const emp = empleadosDisponiblesPlanilla().find(e => textoNormalizado(e.nombre) === valor);
  hidden.value = emp ? emp.id : '';
  cargarEmpleadoPlanilla();
}
function datosPlanillaForm() {
  const emp = empleadoPorId(document.getElementById('p-empleado').value);
  const extraDias = leerExtraDiasForm();
  return {
    empleado: emp,
    fechaInicio: document.getElementById('p-fecha-inicio').value,
    fechaFin: document.getElementById('p-fecha-fin').value,
    hOrdinarias: num(document.getElementById('p-h-ordinarias').value),
    extraDias,
    extraDia: resumenDiasExtra(extraDias),
    hExtra: totalHorasExtra(extraDias),
    hSeptimo: num(document.getElementById('p-h-septimo').value),
    hAsueto: num(document.getElementById('p-h-asueto').value),
    otrosIngresos: num(document.getElementById('p-otros-ingresos').value),
    aplicarRenta: document.getElementById('p-aplicar-renta').checked,
    aplicarIsss: emp?.descontarIsss !== false,
    aplicarAfp: emp?.descontarAfp !== false,
    prestamos: num(document.getElementById('p-prestamos').value),
    otrosDescuentos: num(document.getElementById('p-otros-descuentos').value)
  };
}
function calcularPreviewPlanilla() {
  const d = datosPlanillaForm();
  const calc = calcularPago(d);
  document.getElementById('p-isss').value = money(calc.isss);
  document.getElementById('p-afp').value = money(calc.afp);
  document.getElementById('p-renta-sugerida').value = money(calc.rentaSugerida);
  document.getElementById('p-prev-devengado').textContent = money(calc.devengado);
  document.getElementById('p-prev-descuentos').textContent = money(calc.descuentos);
  document.getElementById('p-prev-neto').textContent = money(calc.neto);
  document.getElementById('p-prev-afp-inst').textContent = d.empleado?.descontarAfp === false ? 'No aplica' : (d.empleado?.afpInstitucion || '-');
  return calc;
}
function guardarRegistroPlanilla() {
  const d = datosPlanillaForm();
  if (!d.empleado) { toast('Selecciona un empleado disponible.'); return; }
  if (!empleadoDisponiblePlanilla(d.empleado)) { toast('Ese empleado ya está en la planilla actual.'); return; }
  if (!d.fechaInicio || !d.fechaFin) { toast('Selecciona la semana de pago.'); return; }
  const calc = calcularPago(d);
  const registro = {
    id: planillaEditId || uid(),
    empleadoId: d.empleado.id,
    empleadoSnapshot: normalizarEmpleado(d.empleado),
    fechaRegistro: todayIso(),
    fechaInicio: d.fechaInicio,
    fechaFin: d.fechaFin,
    hOrdinarias: d.hOrdinarias,
    extraDias: d.extraDias,
    extraDia: d.extraDia,
    hExtra: d.hExtra,
    hSeptimo: d.hSeptimo,
    hAsueto: d.hAsueto,
    otrosIngresos: d.otrosIngresos,
    prestamos: d.prestamos,
    otrosDescuentos: d.otrosDescuentos,
    aplicarRenta: d.aplicarRenta,
    aplicarIsss: d.aplicarIsss,
    aplicarAfp: d.aplicarAfp,
    calc,
    boletaGenerada: false
  };
  const idx = state.planillas.findIndex(p => p.id === registro.id);
  if (idx >= 0) state.planillas[idx] = registro; else state.planillas.push(registro);
  planillaEditId = null;
  limpiarPlanillaForm(false);
  guardarEstado();
  toast('Registro agregado y boleta creada automáticamente.');
}
function editarPlanilla(id) {
  const p = state.planillas.find(x => x.id === id);
  if (!p) return;
  planillaEditId = id;
  showTab('planilla');
  renderSelects();
  document.getElementById('p-fecha-inicio').value = p.fechaInicio;
  document.getElementById('p-fecha-fin').value = p.fechaFin;
  document.getElementById('p-empleado').value = p.empleadoId;
  document.getElementById('p-empleado-buscar').value = p.empleadoSnapshot.nombre;
  cargarEmpleadoPlanilla();
  document.getElementById('p-h-ordinarias').value = p.hOrdinarias;
  cargarExtraDiasForm(p.extraDias);
  document.getElementById('p-h-septimo').value = p.hSeptimo;
  ponerNumeroReferencia('p-h-asueto', p.hAsueto);
  ponerNumeroReferencia('p-otros-ingresos', p.otrosIngresos);
  document.getElementById('p-aplicar-renta').checked = p.aplicarRenta;
  ponerNumeroReferencia('p-prestamos', p.prestamos);
  ponerNumeroReferencia('p-otros-descuentos', p.otrosDescuentos);
  document.getElementById('planilla-mode').textContent = 'Editar';
  document.getElementById('planilla-mode').className = 'badge badge-amber';
  calcularPreviewPlanilla();
}
function eliminarPlanilla(id) {
  if (!confirm('¿Eliminar este registro completo? También se borrará su boleta e historial relacionado.')) return;
  eliminarRegistroPlanilla(id);
  guardarEstado();
  toast('Registro eliminado completamente.');
}
function eliminarRegistroPlanilla(id) {
  const boletaIds = state.boletas.filter(b => b.planillaId === id).map(b => b.id);
  state.planillas = state.planillas.filter(p => p.id !== id);
  state.boletas = state.boletas.filter(b => b.planillaId !== id);
  state.historialPagos = state.historialPagos.filter(p => p.planillaId !== id && !boletaIds.includes(p.id));
}
function eliminarEmpleado(id) {
  const emp = empleadoPorId(id);
  if (!emp) return;
  if (!confirm('¿Eliminar completamente a este empleado? Se borrarán sus planillas, boletas e historial.')) return;
  state.planillas.filter(p => p.empleadoId === id).forEach(p => eliminarRegistroPlanilla(p.id));
  state.empleados = state.empleados.filter(e => e.id !== id);
  state.boletas = state.boletas.filter(b => b.empleadoId !== id);
  state.historialPagos = state.historialPagos.filter(p => p.empleadoId !== id);
  if (empleadoEditId === id) limpiarEmpleadoForm();
  guardarEstado();
  toast('Empleado y registros relacionados eliminados.');
}
function eliminarPagoHistorial(id) {
  const pago = state.historialPagos.find(p => p.id === id);
  if (!pago) return;
  if (!confirm('¿Eliminar este pago del historial? Se borrará también su boleta y planilla relacionada.')) return;
  const boleta = boletaDesdePago(pago);
  const planillaId = pago.planillaId || boleta?.planillaId;
  if (planillaId) eliminarRegistroPlanilla(planillaId);
  state.historialPagos = state.historialPagos.filter(p => p.id !== id);
  state.boletas = state.boletas.filter(b => b.id !== id);
  guardarEstado();
  toast('Pago eliminado completamente.');
}
function eliminarBoleta(id) {
  const boleta = state.boletas.find(b => b.id === id);
  if (!boleta) return;
  if (!confirm('¿Eliminar esta boleta? Se borrará también la planilla y el historial relacionado.')) return;
  if (boleta.planillaId) eliminarRegistroPlanilla(boleta.planillaId);
  state.boletas = state.boletas.filter(b => b.id !== id);
  state.historialPagos = state.historialPagos.filter(p => p.id !== id);
  guardarEstado();
  toast('Boleta eliminada completamente.');
}
function editarPagoHistorial(id) {
  const pago = state.historialPagos.find(p => p.id === id);
  if (!pago?.planillaId) { toast('Este pago no tiene una planilla editable relacionada.'); return; }
  editarPlanilla(pago.planillaId);
}
function editarBoleta(id) {
  const boleta = state.boletas.find(b => b.id === id);
  if (!boleta?.planillaId) { toast('Esta boleta no tiene una planilla editable relacionada.'); return; }
  editarPlanilla(boleta.planillaId);
}
function limpiarPlanillaForm(resetWeek = true) {
  const semanaInicio = document.getElementById('p-fecha-inicio').value;
  const semanaFin = document.getElementById('p-fecha-fin').value;
  document.getElementById('planilla-form').reset();
  if (resetWeek || !semanaInicio || !semanaFin) {
    setSemanaActual();
  } else {
    document.getElementById('p-fecha-inicio').value = semanaInicio;
    document.getElementById('p-fecha-fin').value = semanaFin;
  }
  planillaEditId = null;
  document.getElementById('p-empleado').value = '';
  document.getElementById('p-empleado-buscar').value = '';
  cargarExtraDiasForm();
  document.getElementById('planilla-mode').textContent = 'Nuevo';
  document.getElementById('planilla-mode').className = 'badge badge-blue';
  cargarEmpleadoPlanilla();
  renderSelects();
}

function leerEmpleadoForm() {
  return normalizarEmpleado({
    id: empleadoEditId || uid(),
    nombre: document.getElementById('e-nombre').value,
    dui: document.getElementById('e-dui').value,
    telefono: document.getElementById('e-telefono').value,
    direccion: document.getElementById('e-direccion').value,
    fechaIngreso: document.getElementById('e-fecha-ingreso').value,
    cargo: document.getElementById('e-cargo').value,
    departamento: document.getElementById('e-departamento').value,
    salarioHora: document.getElementById('e-salario-hora').value,
    tipoPago: document.getElementById('e-tipo-pago').value,
    afpInstitucion: document.getElementById('e-afp-institucion').value,
    descontarIsss: document.getElementById('e-desc-isss').checked,
    descontarAfp: document.getElementById('e-desc-afp').checked,
    aplicarRenta: document.getElementById('e-desc-renta').checked,
    estado: document.getElementById('e-estado').value,
    fechaSalida: document.getElementById('e-fecha-salida').value,
    contactoNombre: document.getElementById('e-contacto-nombre').value,
    contactoTelefono: document.getElementById('e-contacto-telefono').value,
    contactoParentesco: document.getElementById('e-contacto-parentesco').value
  });
}
function guardarEmpleado() {
  const emp = leerEmpleadoForm();
  if (!emp.nombre || !emp.fechaIngreso || !emp.cargo || !emp.departamento || emp.salarioHora <= 0) {
    toast('Completa nombre, ingreso, cargo, departamento y salario.');
    return;
  }
  if (emp.estado === 'inactivo' && !emp.fechaSalida) {
    toast('Indica el primer día que el empleado ya no asistió.');
    return;
  }
  const dup = state.empleados.find(e => e.id !== emp.id && e.nombre.toLowerCase() === emp.nombre.toLowerCase());
  if (dup) { toast('Ya existe un empleado con ese nombre.'); return; }
  const idx = state.empleados.findIndex(e => e.id === emp.id);
  if (idx >= 0) state.empleados[idx] = emp; else state.empleados.push(emp);
  empleadoEditId = null;
  limpiarEmpleadoForm();
  guardarEstado();
  toast('Empleado guardado.');
}
function editarEmpleado(id) {
  const e = empleadoPorId(id);
  if (!e) return;
  empleadoEditId = id;
  showTab('empleados');
  document.getElementById('e-nombre').value = e.nombre;
  document.getElementById('e-dui').value = e.dui;
  document.getElementById('e-telefono').value = e.telefono;
  document.getElementById('e-direccion').value = e.direccion;
  document.getElementById('e-fecha-ingreso').value = e.fechaIngreso;
  document.getElementById('e-cargo').value = e.cargo;
  document.getElementById('e-departamento').value = e.departamento;
  document.getElementById('e-salario-hora').value = e.salarioHora;
  document.getElementById('e-tipo-pago').value = e.tipoPago;
  document.getElementById('e-afp-institucion').value = e.afpInstitucion;
  document.getElementById('e-desc-isss').checked = e.descontarIsss !== false;
  document.getElementById('e-desc-afp').checked = e.descontarAfp !== false;
  document.getElementById('e-desc-renta').checked = !!e.aplicarRenta;
  document.getElementById('e-estado').value = e.estado;
  document.getElementById('e-fecha-salida').value = e.fechaSalida;
  document.getElementById('e-contacto-nombre').value = e.contactoNombre;
  document.getElementById('e-contacto-telefono').value = e.contactoTelefono;
  document.getElementById('e-contacto-parentesco').value = e.contactoParentesco;
  document.getElementById('empleado-form-title').textContent = 'Editando: ' + e.nombre;
  document.getElementById('empleado-mode').textContent = 'Editar';
  document.getElementById('empleado-mode').className = 'badge badge-amber';
  toggleFechaSalida();
}
function limpiarEmpleadoForm(reset = true) {
  if (reset) empleadoEditId = null;
  document.getElementById('empleado-form').reset();
  document.getElementById('e-estado').value = 'activo';
  document.getElementById('e-afp-institucion').value = 'Confía';
  document.getElementById('e-tipo-pago').value = 'Semanal';
  document.getElementById('e-salario-hora').value = '1.68';
  document.getElementById('e-desc-isss').checked = true;
  document.getElementById('e-desc-afp').checked = true;
  document.getElementById('e-desc-renta').checked = false;
  document.getElementById('empleado-form-title').textContent = 'Registro completo de empleado';
  document.getElementById('empleado-mode').textContent = 'Nuevo';
  document.getElementById('empleado-mode').className = 'badge badge-blue';
  toggleFechaSalida();
}
function toggleFechaSalida() {
  const inactive = document.getElementById('e-estado').value === 'inactivo';
  document.getElementById('e-fecha-salida').disabled = !inactive;
}
function formatearDui(input) {
  const digits = String(input.value || '').replace(/\D/g, '').slice(0, 9);
  input.value = digits.length > 8 ? digits.slice(0, 8) + '-' + digits.slice(8) : digits;
}
function descuentosEmpleadoHtml(e) {
  const items = [];
  if (e.descontarIsss !== false) items.push('ISSS');
  if (e.descontarAfp !== false) items.push('AFP');
  if (e.aplicarRenta) items.push('Renta');
  return items.length ? `<span class="col-sub">${esc(items.join(' · '))}</span>` : '<span class="badge badge-amber">Sin ley</span>';
}
function verHistorialEmpleado(id) {
  showTab('historial');
  document.getElementById('h-empleado').value = id;
  renderHistorial();
}

function generarBoletaSeleccionada() {
  const id = document.getElementById('b-planilla').value;
  generarBoletaDesdePlanilla(id);
}
function imprimirBoletaSeleccionada() {
  const id = document.getElementById('b-planilla').value;
  if (!id) { toast('Selecciona una planilla para imprimir.'); return; }
  const existente = state.boletas.slice().reverse().find(b => b.planillaId === id);
  if (existente) abrirBoleta(existente.id); else generarBoletaDesdePlanilla(id);
  setTimeout(() => window.print(), 100);
}
function construirBoletaDesdePlanilla(p, existente) {
  return {
    id: existente?.id || uid(),
    planillaId: p.id,
    empleadoId: p.empleadoId,
    empleado: p.empleadoSnapshot.nombre,
    fecha: existente?.fecha || todayIso(),
    periodo: periodoTexto(p),
    devengado: p.calc.devengado,
    descuentos: p.calc.descuentos,
    neto: p.calc.neto,
    data: JSON.parse(JSON.stringify(p))
  };
}
function construirPagoDesdePlanilla(p, boleta) {
  return normalizarPago({
    id: boleta.id,
    planillaId: p.id,
    empleadoId: p.empleadoId,
    empleado: p.empleadoSnapshot.nombre,
    fecha: boleta.fecha,
    periodo: boleta.periodo,
    devengado: p.calc.devengado,
    isss: p.calc.isss,
    afp: p.calc.afp,
    renta: p.calc.renta,
    otrosDescuentos: p.calc.prestamos + p.calc.otrosDescuentos,
    descuentos: p.calc.descuentos,
    neto: p.calc.neto
  });
}
function guardarBoletaAutomatica(p) {
  const idx = state.boletas.findIndex(b => b.planillaId === p.id);
  const boleta = construirBoletaDesdePlanilla(p, idx >= 0 ? state.boletas[idx] : null);
  if (idx >= 0) state.boletas[idx] = boleta; else state.boletas.push(boleta);
  const pago = construirPagoDesdePlanilla(p, boleta);
  const pagoIdx = state.historialPagos.findIndex(x => x.id === boleta.id || x.planillaId === p.id);
  if (pagoIdx >= 0) state.historialPagos[pagoIdx] = pago; else state.historialPagos.push(pago);
  p.boletaGenerada = true;
  return boleta;
}
function sincronizarBoletasConPlanillas() {
  const vistos = new Set();
  const boletasContenidoVistas = new Set();
  state.boletas = state.boletas.slice().reverse().filter(b => {
    const contenidoKey = `${b.empleadoId}|${b.periodo}|${red(b.devengado)}|${red(b.neto)}`;
    if (b.planillaId && vistos.has(b.planillaId)) return false;
    if (boletasContenidoVistas.has(contenidoKey)) return false;
    if (b.planillaId) vistos.add(b.planillaId);
    boletasContenidoVistas.add(contenidoKey);
    return true;
  }).reverse();
  state.planillas.forEach(p => {
    if (empleadoPorId(p.empleadoId)?.estado === 'activo') guardarBoletaAutomatica(p);
  });
  const pagosVistos = new Set();
  const pagosContenidoVistos = new Set();
  state.historialPagos = state.historialPagos.slice().reverse().filter(p => {
    const contenidoKey = `${p.empleadoId}|${p.periodo}|${red(p.devengado)}|${red(p.neto)}`;
    if (p.planillaId && pagosVistos.has(p.planillaId)) return false;
    if (pagosContenidoVistos.has(contenidoKey)) return false;
    if (p.planillaId) pagosVistos.add(p.planillaId);
    pagosContenidoVistos.add(contenidoKey);
    return true;
  }).reverse();
}
function generarBoletaDesdePlanilla(id) {
  const p = state.planillas.find(x => x.id === id);
  if (!p) { toast('Selecciona una planilla.'); return; }
  const empActual = empleadoPorId(p.empleadoId);
  if (!empActual) { toast('No se encontró el empleado de esta planilla.'); return; }
  const boleta = guardarBoletaAutomatica(p);
  guardarEstado();
  mostrarBoleta(p, boleta);
  toast('Boleta lista para imprimir.');
}
function abrirBoleta(id) {
  const b = state.boletas.find(x => x.id === id);
  if (!b) return;
  mostrarBoleta(b.data, b);
}
function toggleBoletasSeleccionadas(checked) {
  document.querySelectorAll('.boleta-check').forEach(input => { input.checked = checked; });
}
function boletasSeleccionadas() {
  const ids = Array.from(document.querySelectorAll('.boleta-check:checked')).map(input => input.value);
  return ids.map(id => state.boletas.find(b => b.id === id)).filter(Boolean);
}
function imprimirBoletasSeleccionadas() {
  const seleccionadas = boletasSeleccionadas();
  if (!seleccionadas.length) { toast('Selecciona al menos una boleta para imprimir.'); return; }
  mostrarBoletas(seleccionadas);
  setTimeout(() => window.print(), 100);
}
function toggleHistorialSeleccionado(checked) {
  document.querySelectorAll('.historial-check').forEach(input => { input.checked = checked; });
}
function boletaDesdePago(pago) {
  return state.boletas.find(b => b.id === pago.id || b.planillaId === pago.planillaId);
}
function pagosSeleccionadosHistorial() {
  const ids = Array.from(document.querySelectorAll('.historial-check:checked')).map(input => input.value);
  return ids.map(id => state.historialPagos.find(p => p.id === id)).filter(Boolean);
}
function imprimirHistorialSeleccionado() {
  const pagos = pagosSeleccionadosHistorial();
  if (!pagos.length) { toast('Selecciona al menos un pago del historial.'); return; }
  const boletas = pagos.map(boletaDesdePago).filter(Boolean);
  if (!boletas.length) { toast('No se encontró boleta para los pagos seleccionados.'); return; }
  mostrarBoletas(boletas);
  setTimeout(() => window.print(), 100);
}
function totalesDetallePlanilla(planillas) {
  return planillas.reduce((total, p) => {
    total.horasD += num(p.hOrdinarias);
    total.horasN += 0;
    total.horasExtra += num(p.hExtra);
    total.horasSeptimo += num(p.hSeptimo);
    total.horasAsueto += num(p.hAsueto);
    total.devengado += num(p.calc?.devengado);
    total.renta += num(p.calc?.renta);
    total.isss += num(p.calc?.isss);
    total.afp += num(p.calc?.afp);
    total.otros += num(p.calc?.prestamos) + num(p.calc?.otrosDescuentos);
    total.neto += num(p.calc?.neto);
    return total;
  }, { horasD: 0, horasN: 0, horasExtra: 0, horasSeptimo: 0, horasAsueto: 0, devengado: 0, renta: 0, isss: 0, afp: 0, otros: 0, neto: 0 });
}
function filaTotalesDetalle(label, total, clase = '') {
  return `<tr class="${clase}"><th colspan="2">${esc(label)}</th><th>${num(total.horasD).toFixed(2)}</th><th>${num(total.horasN).toFixed(2)}</th><th>${num(total.horasExtra).toFixed(2)}</th><th>${num(total.horasSeptimo).toFixed(2)}</th><th>${num(total.horasAsueto).toFixed(2)}</th><th>${money(total.devengado)}</th><th>${money(total.renta)}</th><th>${money(total.isss)}</th><th>${money(total.afp)}</th><th>${money(total.otros)}</th><th>${money(total.neto)}</th></tr>`;
}
function abrirDetallePlanilla() {
  if (!state.planillas.length) { toast('No hay registros para generar el detalle.'); return; }
  const grupos = new Map();
  state.planillas.forEach(p => {
    const area = p.empleadoSnapshot?.departamento || 'Sin área';
    if (!grupos.has(area)) grupos.set(area, []);
    grupos.get(area).push(p);
  });
  const periodos = [...new Set(state.planillas.map(periodoTexto))].join(' / ');
  const secciones = [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'es')).map(([area, planillas]) => {
    const ordenadas = planillas.slice().sort((a, b) => a.empleadoSnapshot.nombre.localeCompare(b.empleadoSnapshot.nombre, 'es'));
    const filas = ordenadas.map(p => {
      const c = p.calc || {};
      const otros = num(c.prestamos) + num(c.otrosDescuentos);
      return `<tr><td>${esc(p.empleadoSnapshot.nombre)}</td><td>${money(p.empleadoSnapshot.salarioHora)}</td><td>${num(p.hOrdinarias).toFixed(2)}</td><td>0.00</td><td>${num(p.hExtra).toFixed(2)}</td><td>${num(p.hSeptimo).toFixed(2)}</td><td>${num(p.hAsueto).toFixed(2)}</td><td>${money(c.devengado)}</td><td>${money(c.renta)}</td><td>${money(c.isss)}</td><td>${money(c.afp)}</td><td>${money(otros)}</td><td>${money(c.neto)}</td></tr>`;
    }).join('');
    return `<section class="payroll-area"><h3>ÁREA: ${esc(area.toUpperCase())}</h3><table class="payroll-detail-table"><thead><tr><th>Empleado</th><th>Sueldo/Hora</th><th>H. D.</th><th>H. N.</th><th>H. Extra</th><th>H. Sept./Desc.</th><th>H. Asueto</th><th>Devengado</th><th>Renta</th><th>ISSS</th><th>AFP</th><th>Otros desc.</th><th>Salario neto</th></tr></thead><tbody>${filas}</tbody><tfoot>${filaTotalesDetalle('Subtotal ' + area, totalesDetallePlanilla(ordenadas), 'area-subtotal')}</tfoot></table></section>`;
  }).join('');
  const totalGeneral = totalesDetallePlanilla(state.planillas);
  document.getElementById('payroll-detail-content').innerHTML = `<div class="payroll-report-header"><h1>EXCOMERCAFE SA DE CV</h1><h2>DETALLE DE PLANILLA DE SUELDOS</h2><div><strong>Período:</strong> ${esc(periodos)}</div></div>${secciones}<section class="payroll-area payroll-grand-section"><h3>TOTAL GENERAL DE PLANILLA</h3><table class="payroll-detail-table payroll-grand-total"><thead><tr><th>Concepto</th><th>Sueldo/Hora</th><th>H. D.</th><th>H. N.</th><th>H. Extra</th><th>H. Sept./Desc.</th><th>H. Asueto</th><th>Devengado</th><th>Renta</th><th>ISSS</th><th>AFP</th><th>Otros desc.</th><th>Salario neto</th></tr></thead><tbody>${filaTotalesDetalle('TOTAL GENERAL', totalGeneral, 'grand-total')}</tbody></table></section>`;
  document.getElementById('payroll-detail-overlay').classList.add('open');
}
function cerrarDetallePlanilla() {
  document.getElementById('payroll-detail-overlay').classList.remove('open');
}
function limpiarModoImpresionDetalle() {
  document.body.classList.remove('printing-payroll-detail');
  document.getElementById('payroll-detail-page-style')?.remove();
}
function imprimirDetallePlanilla() {
  document.body.classList.add('printing-payroll-detail');
  const style = document.createElement('style');
  style.id = 'payroll-detail-page-style';
  style.textContent = '@page { size: letter landscape; margin: 8mm; }';
  document.head.appendChild(style);
  window.print();
}
window.addEventListener('afterprint', limpiarModoImpresionDetalle);
document.getElementById('payroll-detail-overlay').addEventListener('click', e => { if (e.target.id === 'payroll-detail-overlay') cerrarDetallePlanilla(); });
function generarCopiaBoleta(p, boleta, vacia = false) {
  const emp = vacia ? {} : p.empleadoSnapshot;
  const c = vacia ? {} : p.calc;
  const espacio = '&nbsp;';
  const texto = value => vacia ? espacio : esc(value || '');
  const dinero = value => vacia ? espacio : money(value);
  const cantidad = value => vacia ? espacio : num(value).toFixed(2);
  const fechaCorta = fecha => {
    if (vacia || !fecha) return '';
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const d = new Date(fecha + 'T00:00:00');
    return String(d.getDate()).padStart(2, '0') + '-' + meses[d.getMonth()] + '-' + d.getFullYear();
  };
  const periodo = vacia ? espacio : fechaCorta(p.fechaInicio) + ' ' + fechaCorta(p.fechaFin);
  const line = (label, qty, amount) => `
    <div class="paper-line">
      <span class="label">${label}</span>
      <span class="qty">${cantidad(qty)}</span>
      <strong class="amount">${dinero(amount)}</strong>
    </div>`;
  const simple = (label, amount) => `
    <div class="paper-line simple">
      <span class="label">${label}</span>
      <strong class="amount">${dinero(amount)}</strong>
    </div>`;
  const deductionLine = (label, amount) => `
    <div class="paper-line simple deduction-line">
      <span class="label">${label}</span>
      <strong class="amount">${dinero(amount)}</strong>
    </div>`;
  const moneyLine = (label, amount) => `
    <div class="paper-line">
      <span class="label">${label}</span>
      <span class="qty">${cantidad(0)}</span>
      <strong class="amount">${dinero(amount)}</strong>
    </div>`;
  return `
    <section class="receipt-copy${vacia ? ' blank-copy' : ''}">
      <div class="receipt-header">
        <div class="receipt-company">EXCOMERCAFE SA DE CV</div>
        <div class="receipt-subtitle">COMPROBANTE DE PAGO</div>
      </div>
      <div class="receipt-body">
        <div class="receipt-topline">
          <div><strong>Planilla:</strong>&nbsp;&nbsp; ${texto((emp.departamento || 'BENEFICIO OPERARIOS').toUpperCase())}</div>
          <div><strong>Periodo:</strong> ${periodo}</div>
        </div>
        <div class="receipt-frame">
          <div class="receipt-employee-row">
            <div class="receipt-employee-main"><strong>${texto(emp.nombre)}</strong><div>${texto((emp.cargo || emp.departamento || '').toUpperCase())}</div></div>
            <div class="receipt-pay-type"><span>Tipo de pago:</span><strong>${texto(emp.tipoPago || 'Semanal')}</strong></div>
            <div class="receipt-amount-box"><span>POR:</span><strong>${dinero(c.neto)}</strong></div>
          </div>
          <div class="receipt-columns">
            <div class="receipt-income-col">
              <div class="paper-section-title">INGRESOS:</div>
              <div>
                ${moneyLine('Salario Hora:', emp.salarioHora)}
                ${line('H. Ordi. Diurnas:', p?.hOrdinarias, c.ord)}
                ${line('H. Ordi. Nocturnas:', 0, 0)}
                ${line('H. Extr. Diurnas:', p?.hExtra, c.extra)}
                ${line('H. Extr. Nocturnas:', 0, 0)}
                ${line('H. Desc./Sept:', p?.hSeptimo, c.septimo)}
                ${line('H. Asueto:', p?.hAsueto, c.asueto)}
                ${moneyLine('Incapacidad:', 0)}
                ${moneyLine('Ingresos exentos:', 0)}
                ${moneyLine('Otros Ingresos:', c.otrosIngresos)}
              </div>
            </div>
            <div class="receipt-deductions-col">
              <div class="paper-total-row devengado-row"><span>Sueldo Devengado:</span><strong>${dinero(c.devengado)}</strong></div>
              <div class="paper-section-title">DEDUCCIONES DE LEY:</div>
              <div>
                ${deductionLine('Renta:', c.renta)}
                ${deductionLine('ISSS:', c.isss)}
                ${deductionLine('AFP ' + texto((emp.afpInstitucion || 'CONFÍA').toUpperCase()) + ':', c.afp)}
              </div>
              <div class="paper-section-title other-discounts-title">OTROS DESCUENTOS:</div>
              <div>
                ${deductionLine('Otros:', c.otrosDescuentos)}
                ${deductionLine('Prest.:', c.prestamos)}
              </div>
              <div class="paper-line simple deduction-line descuentos-row"><span class="label">TOTAL DESCUENTOS</span><strong class="amount">${dinero(c.descuentos)}</strong></div>
              <div class="receipt-signoff"><div><strong>Recibí conforme&nbsp;&nbsp;&nbsp; ${dinero(c.neto)}</strong></div><div class="receipt-sign-line"></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}
function mostrarBoletas(boletas) {
  const copias = boletas.map(b => {
    const data = b.data || state.planillas.find(p => p.id === b.planillaId);
    return data ? generarCopiaBoleta(data, b) : generarCopiaBoleta(null, null, true);
  });
  if (copias.length % 2 !== 0) copias.push(generarCopiaBoleta(null, null, true));
  document.getElementById('receipt-pages').innerHTML = copias.join('');
  document.getElementById('rec-footer').textContent = copias.length + ' comprobante' + (copias.length === 1 ? '' : 's') + ' · SisPlanilla Exco';
  document.getElementById('receipt-overlay').classList.add('open');
}
function mostrarBoleta(p, boleta) {
  mostrarBoletas([{ ...boleta, data: p || boleta.data }]);
}
function cerrarRecibo() { document.getElementById('receipt-overlay').classList.remove('open'); }
function imprimirRecibo() { window.print(); }
document.getElementById('receipt-overlay').addEventListener('click', e => { if (e.target.id === 'receipt-overlay') cerrarRecibo(); });

function tiempoLaborado(emp) {
  if (!emp?.fechaIngreso) return 'Sin fecha de ingreso';
  const start = new Date(emp.fechaIngreso + 'T00:00:00');
  const end = new Date((emp.estado === 'inactivo' && emp.fechaSalida ? emp.fechaSalida : todayIso()) + 'T00:00:00');
  if (end < start) return '0 años, 0 meses, 0 días';
  let y = end.getFullYear() - start.getFullYear();
  let m = end.getMonth() - start.getMonth();
  let d = end.getDate() - start.getDate();
  if (d < 0) { m--; d += new Date(end.getFullYear(), end.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return `${y} años, ${m} meses, ${d} días`;
}

function renderTodo() {
  sincronizarBoletasConPlanillas();
  renderStats();
  renderSelects();
  renderEmpleados();
  renderPlanilla();
  renderHistorial();
  renderBoletasGeneradas();
  calcularPreviewPlanilla();
}
function renderStats() {
  const activos = empleadosActivos().length;
  const inactivos = state.empleados.filter(e => e.estado === 'inactivo').length;
  const planillasSemana = state.planillas.filter(planillaVigente);
  const netoSemana = planillasSemana.reduce((s, p) => s + num(p.calc?.neto), 0);
  document.getElementById('stat-activos').textContent = activos;
  document.getElementById('stat-inactivos').textContent = inactivos;
  document.getElementById('stat-pagos').textContent = planillasSemana.length;
  document.getElementById('stat-neto-historico').textContent = money(netoSemana);
  document.getElementById('dash-activos').textContent = activos;
  document.getElementById('dash-inactivos').textContent = inactivos;
  document.getElementById('dash-planillas').textContent = state.planillas.length;
  document.getElementById('dash-boletas').textContent = state.boletas.length;
}
function renderSelects() {
  const planillaOptions = empleadosDisponiblesPlanilla().map(e => `<option value="${esc(e.nombre)}">${esc(e.departamento)} - ${esc(e.cargo)}</option>`).join('');
  const empleadosConPlanilla = ordenarPorNombre(state.empleados.filter(e => state.planillas.some(p => p.empleadoId === e.id && planillaVigente(p))));
  const boletaOptions = empleadosConPlanilla.map(e => `<option value="${e.id}">${esc(e.nombre)} · ${esc(e.departamento)}${e.estado === 'inactivo' ? ' · Inactivo' : ''}</option>`).join('');
  document.getElementById('p-empleados-lista').innerHTML = planillaOptions;
  const planillaHidden = document.getElementById('p-empleado');
  const planillaInput = document.getElementById('p-empleado-buscar');
  const planillaActual = empleadoPorId(planillaHidden.value);
  if (planillaHidden.value && !empleadoDisponiblePlanilla(planillaActual)) {
    planillaHidden.value = '';
    if (planillaInput) planillaInput.value = '';
  }
  document.getElementById('b-empleado').innerHTML = boletaOptions || '<option value="">No hay planillas disponibles</option>';
  document.getElementById('h-empleado').innerHTML = ordenarPorNombre(state.empleados).map(e => `<option value="${e.id}">${esc(e.nombre)} · ${e.estado === 'activo' ? 'Activo' : 'Inactivo'}</option>`).join('') || '<option value="">Sin empleados</option>';
  cargarEmpleadoPlanilla();
  renderBoletasDisponibles();
}
function renderEmpleados() {
  const busquedaEl = document.getElementById('empleado-buscar');
  const contraidoEl = document.getElementById('empleados-contraido');
  const filtro = (busquedaEl?.value || '').trim().toLowerCase();
  const contraido = !!contraidoEl?.checked;
  const empleadosFiltrados = ordenarPorNombre(state.empleados).filter(e => {
    if (!filtro) return true;
    return (e.nombre || '').toLowerCase().includes(filtro) || (e.dui || '').toLowerCase().includes(filtro);
  });
  const totalTxt = empleadosFiltrados.length === state.empleados.length
    ? state.empleados.length + ' empleado' + (state.empleados.length === 1 ? '' : 's')
    : empleadosFiltrados.length + ' de ' + state.empleados.length;
  document.getElementById('empleados-count').textContent = totalTxt;
  const tbody = document.getElementById('empleados-tbody');
  const wrap = document.getElementById('empleados-lista-wrap');
  if (wrap) {
    wrap.style.display = contraido ? 'none' : '';
    let note = document.getElementById('empleados-contraido-note');
    if (contraido) {
      if (!note) {
        note = document.createElement('div');
        note.id = 'empleados-contraido-note';
        note.className = 'collapsed-note';
        wrap.parentNode.insertBefore(note, wrap);
      }
      note.textContent = 'Lista contraída. Desmarca "Contraer lista" para ver los empleados.';
    } else if (note) {
      note.parentNode.removeChild(note);
    }
  }
  if (!state.empleados.length) { tbody.innerHTML = '<tr><td colspan="10"><div class="table-empty">No hay empleados registrados.</div></td></tr>'; return; }
  if (!empleadosFiltrados.length) { tbody.innerHTML = '<tr><td colspan="10"><div class="table-empty">No se encontraron empleados con esa búsqueda.</div></td></tr>'; return; }
  tbody.innerHTML = empleadosFiltrados.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><div class="col-name">${esc(e.nombre)}</div><div class="col-sub">DUI: ${esc(e.dui || '—')}</div></td>
      <td><div>${esc(e.telefono || '—')}</div><div class="col-sub">${esc(e.contactoNombre || '')}</div></td>
      <td>${esc(e.fechaIngreso || '—')}</td>
      <td>${esc(e.cargo)}</td>
      <td>${esc(e.departamento)}</td>
      <td>${money(e.salarioHora)}</td>
      <td>${descuentosEmpleadoHtml(e)}</td>
      <td>${e.estado === 'activo' ? '<span class="badge badge-green">🟢 Activo</span>' : '<span class="badge badge-red">🔴 Inactivo</span>'}</td>
      <td class="actions-cell"><button class="btn btn-amber btn-sm" onclick="editarEmpleado('${e.id}')">Editar</button><button class="btn btn-ghost btn-sm" onclick="verHistorialEmpleado('${e.id}')">Historial</button><button class="btn btn-danger btn-sm" onclick="eliminarEmpleado('${e.id}')">Borrar</button></td>
    </tr>`).join('');
}
function renderPlanilla() {
  document.getElementById('planilla-count').textContent = state.planillas.length + ' registro' + (state.planillas.length === 1 ? '' : 's');
  const tbody = document.getElementById('planilla-tbody');
  const tfoot = document.getElementById('planilla-tfoot');
  if (!state.planillas.length) { tbody.innerHTML = '<tr><td colspan="11"><div class="table-empty">No hay registros de planilla.</div></td></tr>'; tfoot.innerHTML = ''; return; }
  let dev = 0, desc = 0, net = 0;
  tbody.innerHTML = state.planillas.map((p, i) => {
    dev += p.calc.devengado; desc += p.calc.descuentos; net += p.calc.neto;
    return `<tr>
      <td>${i + 1}</td>
      <td><div class="col-name">${esc(p.empleadoSnapshot.nombre)}</div><div class="col-sub">${esc(p.empleadoSnapshot.cargo)} · ${esc(p.empleadoSnapshot.departamento)}</div></td>
      <td>${esc(periodoTexto(p))}</td>
      <td>${p.hOrdinarias}</td><td>${p.hExtra}</td><td>${esc(resumenDiasExtra(p.extraDias) || p.extraDia || '-')}</td>
      <td class="col-money">${money(p.calc.devengado)}</td><td class="col-discount">${money(p.calc.descuentos)}</td><td class="col-net">${money(p.calc.neto)}</td>
      <td class="actions-cell"><button class="btn btn-primary btn-sm" onclick="generarBoletaDesdePlanilla('${p.id}')">Ver boleta</button></td>
      <td class="actions-cell"><button class="btn btn-amber btn-sm" onclick="editarPlanilla('${p.id}')">Editar</button><button class="btn btn-danger btn-sm" onclick="eliminarPlanilla('${p.id}')">Quitar</button></td>
    </tr>`;
  }).join('');
  tfoot.innerHTML = `<tr><td colspan="6">TOTALES</td><td class="col-money">${money(dev)}</td><td class="col-discount">${money(desc)}</td><td class="col-net">${money(net)}</td><td colspan="2"></td></tr>`;
}
function renderHistorial() {
  const select = document.getElementById('h-empleado');
  const emp = empleadoPorId(select.value) || state.empleados[0];
  if (emp && select.value !== emp.id) select.value = emp.id;
  document.getElementById('h-tiempo').value = emp ? tiempoLaborado(emp) : '';
  document.getElementById('h-estado').value = emp ? (emp.estado === 'activo' ? 'Activo' : 'Inactivo') : '';
  const pagos = emp ? state.historialPagos.filter(p => p.empleadoId === emp.id) : [];
  document.getElementById('historial-count').textContent = pagos.length + ' pago' + (pagos.length === 1 ? '' : 's');
  const selectAll = document.getElementById('historial-select-all');
  if (selectAll) selectAll.checked = false;
  const tbody = document.getElementById('historial-tbody');
  const tfoot = document.getElementById('historial-tfoot');
  if (!pagos.length) { tbody.innerHTML = '<tr><td colspan="10"><div class="table-empty">Sin pagos históricos para este empleado.</div></td></tr>'; tfoot.innerHTML = ''; return; }
  let dev = 0, net = 0;
  tbody.innerHTML = pagos.map(p => { dev += p.devengado; net += p.neto; return `<tr><td class="select-cell"><input type="checkbox" class="historial-check" value="${esc(p.id)}"></td><td>${esc(p.fecha)}</td><td>${esc(p.periodo)}</td><td>${money(p.devengado)}</td><td>${money(p.isss)}</td><td>${money(p.afp)}</td><td>${money(p.renta)}</td><td>${money(p.otrosDescuentos)}</td><td class="col-net">${money(p.neto)}</td><td class="actions-cell"><button class="btn btn-amber btn-sm" onclick="editarPagoHistorial('${p.id}')">Editar</button><button class="btn btn-danger btn-sm" onclick="eliminarPagoHistorial('${p.id}')">Borrar</button></td></tr>`; }).join('');
  tfoot.innerHTML = `<tr><td colspan="3">TOTALES</td><td>${money(dev)}</td><td colspan="4"></td><td class="col-net">${money(net)}</td><td></td></tr>`;
}
function renderBoletasDisponibles() {
  const empId = document.getElementById('b-empleado').value;
  const opciones = state.planillas.filter(p => p.empleadoId === empId && planillaVigente(p)).map(p => `<option value="${p.id}">${esc(periodoTexto(p))} · ${money(p.calc.neto)}${p.boletaGenerada ? ' · ya generada' : ''}</option>`).join('');
  document.getElementById('b-planilla').innerHTML = opciones || '<option value="">Sin planillas disponibles</option>';
}
function renderBoletasGeneradas() {
  const visibles = state.boletas.filter(boletaVigente);
  document.getElementById('boletas-count').textContent = visibles.length + ' boleta' + (visibles.length === 1 ? '' : 's');
  const selectAll = document.getElementById('boletas-select-all');
  if (selectAll) selectAll.checked = false;
  const tbody = document.getElementById('boletas-tbody');
  if (!visibles.length) { tbody.innerHTML = '<tr><td colspan="8"><div class="table-empty">No hay boletas vigentes para imprimir esta semana.</div></td></tr>'; return; }
  tbody.innerHTML = visibles.slice().reverse().map(b => `<tr><td class="select-cell"><input type="checkbox" class="boleta-check" value="${esc(b.id)}"></td><td>${esc(b.fecha)}</td><td>${esc(b.empleado)}</td><td>${esc(b.periodo)}</td><td>${money(b.devengado)}</td><td class="col-discount">${money(b.descuentos)}</td><td class="col-net">${money(b.neto)}</td><td class="actions-cell"><button class="btn btn-primary btn-sm" onclick="abrirBoleta('${b.id}')">Ver / Imprimir</button><button class="btn btn-amber btn-sm" onclick="editarBoleta('${b.id}')">Editar</button><button class="btn btn-danger btn-sm" onclick="eliminarBoleta('${b.id}')">Borrar</button></td></tr>`).join('');
}
function setSemanaActual() {
  const monday = lunesDeFecha(todayIso());
  document.getElementById('p-fecha-inicio').value = iso(monday);
  ajustarSemanaDesdeInicio();
}

document.getElementById('today-pill').textContent = new Date().toLocaleDateString('es-SV', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
setSemanaActual();
toggleFechaSalida();
guardarEstado(false);
