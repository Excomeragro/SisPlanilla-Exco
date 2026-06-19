import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const authorization = req.headers.get('Authorization') || '';

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return json({ error: 'Sesión no válida.' }, 401);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || 'create');
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  if (action === 'list') {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return json({ error: error.message }, 400);
    const users = data.users
      .filter((user) => user.email?.endsWith('@sisplanilla.local'))
      .map((user) => ({
        id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || '',
        createdAt: user.created_at,
        current: user.id === authData.user.id,
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
    return json({ users });
  }

  const username = String(body.username || '').trim();
  const normalized = username.toLowerCase();
  const password = String(body.password || '');

  if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) {
    return json({ error: 'El usuario debe tener entre 3 y 32 caracteres y no llevar espacios.' }, 400);
  }
  if (action === 'create' && password.length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);
  if (action === 'update-self' && password && password.length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);

  if (action === 'update-self') {
    const attributes: {
      email: string;
      email_confirm: boolean;
      user_metadata: { username: string };
      password?: string;
    } = {
      email: normalized + '@sisplanilla.local',
      email_confirm: true,
      user_metadata: { username },
    };
    if (password) attributes.password = password;
    const { error } = await admin.auth.admin.updateUserById(authData.user.id, attributes);
    if (error) {
      const duplicate = error.message.toLowerCase().includes('already');
      return json({ error: duplicate ? 'Ese usuario ya existe.' : error.message }, duplicate ? 409 : 400);
    }
    return json({ username });
  }

  if (action !== 'create') return json({ error: 'Acción no permitida.' }, 400);
  const { data, error } = await admin.auth.admin.createUser({
    email: normalized + '@sisplanilla.local',
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) {
    const duplicate = error.message.toLowerCase().includes('already');
    return json({ error: duplicate ? 'Ese usuario ya existe.' : error.message }, duplicate ? 409 : 400);
  }
  return json({ id: data.user.id, username });
});
