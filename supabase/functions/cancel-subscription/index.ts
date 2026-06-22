// Supabase Edge Function: cancel-subscription
// Cancela la suscripción activa de una agencia en Mercado Pago y actualiza su plan a "free".
// Esto evita que sigan cobrando a una agencia que decidió volver al plan gratuito desde la app.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS_HEADERS });
    }

    const { agencyId } = await req.json();
    if (!agencyId) {
      return new Response(JSON.stringify({ error: 'Falta agencyId' }), { status: 400, headers: CORS_HEADERS });
    }

    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agencies')
      .select('id, mp_preapproval_id, subscription_status')
      .eq('id', agencyId)
      .single();

    if (agencyError || !agency) {
      return new Response(JSON.stringify({ error: 'Agencia no encontrada' }), { status: 404, headers: CORS_HEADERS });
    }

    // Si no tiene ninguna suscripción registrada, simplemente nos asegura el estado free
    if (!agency.mp_preapproval_id) {
      await supabaseAdmin
        .from('agencies')
        .update({ subscription_plan: 'free', subscription_status: 'free' })
        .eq('id', agencyId);
      return new Response(JSON.stringify({ success: true, message: 'Sin suscripción activa que cancelar' }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    }

    // Cancelamos la suscripción real en Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${agency.mp_preapproval_id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });

    if (!mpResponse.ok) {
      const errorBody = await mpResponse.text();
      console.error('Error cancelando en Mercado Pago:', errorBody);
      // Aunque falle en Mercado Pago (por ejemplo si ya estaba cancelada), igual reflejamos
      // el estado "free" en nuestra base, para no dejar a la agencia bloqueada en la app.
    }

    await supabaseAdmin
      .from('agencies')
      .update({ subscription_plan: 'free', subscription_status: 'cancelled' })
      .eq('id', agencyId);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('Error inesperado cancelando la suscripción:', err);
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500, headers: CORS_HEADERS });
  }
});
