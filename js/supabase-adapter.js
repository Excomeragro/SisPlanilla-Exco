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

  async function signIn(email, password) {
    if (!client) throw new Error('Supabase no está configurado.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentUser = data.session?.user || null;
    return data.user;
  }

  async function signUp(email, password) {
    if (!client) throw new Error('Supabase no está configurado.');
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo }
    });
    if (error) throw error;
    currentUser = data.session?.user || null;
    return { user: data.user, session: data.session };
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
      .from('sisplanilla_state')
      .select('data, updated_at')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function saveAll(data) {
    if (!client || !currentUser) return null;
    const row = { user_id: currentUser.id, data, updated_at: new Date().toISOString() };
    const { data: saved, error } = await client
      .from('sisplanilla_state')
      .upsert(row, { onConflict: 'user_id' })
      .select('updated_at')
      .single();
    if (error) throw error;
    return saved;
  }

  async function subscribe(onRemoteChange) {
    if (!client || !currentUser) return;
    await unsubscribe();
    realtimeChannel = client
      .channel('sisplanilla-state-' + currentUser.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sisplanilla_state',
        filter: 'user_id=eq.' + currentUser.id
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
    signUp,
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
