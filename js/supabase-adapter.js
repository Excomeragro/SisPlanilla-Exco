(function () {
  let client = null;
  let currentUser = null;
  let realtimeChannel = null;
  let authSubscription = null;

  function config() {
    return window.SISPLANILLA_SUPABASE || {};
  }

  function isEnabled() {
    const cfg = config();
    return !!(cfg.enabled && cfg.url && cfg.anonKey && !cfg.url.includes('TU-PROYECTO') && !cfg.anonKey.includes('TU_'));
  }

  function emailInterno(username) {
    const limpio = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(limpio)) throw new Error('El usuario debe tener entre 3 y 32 caracteres y no llevar espacios.');
    return limpio + '@sisplanilla.local';
  }

  async function init(onAuthChange) {
    if (!isEnabled()) return null;
    if (!window.supabase?.createClient) throw new Error('No se pudo cargar la librería de Supabase.');
    const cfg = config();
    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    currentUser = data.session?.user || null;
    const listener = client.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      setTimeout(() => onAuthChange?.(currentUser), 0);
    });
    authSubscription = listener.data.subscription;
    return currentUser;
  }

  async function signIn(username, password) {
    if (!client) throw new Error('Supabase no está configurado.');
    const email = emailInterno(username);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentUser = data.session?.user || null;
    return data.user;
  }

  async function invokeUserFunction(body) {
    if (!client) throw new Error('Supabase no está configurado.');
    if (!currentUser) throw new Error('Debes iniciar sesión.');
    const { data, error } = await client.functions.invoke('create-user', { body });
    if (error) {
      let detail = '';
      try { detail = (await error.context?.json())?.error || ''; } catch (_error) {}
      throw new Error(detail || error.message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function createUser(username, password) {
    emailInterno(username);
    return invokeUserFunction({ action: 'create', username, password });
  }

  async function listUsers() {
    const data = await invokeUserFunction({ action: 'list' });
    return data.users || [];
  }

  async function updateCurrentUser(username, password) {
    emailInterno(username);
    return invokeUserFunction({ action: 'update-self', username, password });
  }

  async function signOut() {
    if (!client) return;
    await unsubscribe();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    currentUser = null;
  }

  async function loadAll() {
    if (!client || !currentUser) return null;
    const { data, error } = await client
      .from('sisplanilla_company_state')
      .select('data, updated_at')
      .eq('workspace_id', 'exco')
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function saveAll(data) {
    if (!client || !currentUser) return null;
    const row = { workspace_id: 'exco', data, updated_at: new Date().toISOString() };
    const { data: saved, error } = await client
      .from('sisplanilla_company_state')
      .upsert(row, { onConflict: 'workspace_id' })
      .select('updated_at')
      .single();
    if (error) throw error;
    return saved;
  }

  async function subscribe(onRemoteChange) {
    if (!client || !currentUser) return;
    await unsubscribe();
    realtimeChannel = client
      .channel('sisplanilla-company-state')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sisplanilla_company_state',
        filter: 'workspace_id=eq.exco'
      }, payload => {
        if (payload.new?.data) onRemoteChange?.(payload.new.data, payload.new.updated_at);
      })
      .subscribe();
  }

  async function unsubscribe() {
    if (client && realtimeChannel) await client.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  window.SisPlanillaSupabaseAdapter = {
    isEnabled,
    init,
    signIn,
    createUser,
    listUsers,
    updateCurrentUser,
    signOut,
    loadAll,
    saveAll,
    subscribe,
    unsubscribe,
    getUser: () => currentUser,
    destroy() {
      authSubscription?.unsubscribe();
      return unsubscribe();
    }
  };
})();
