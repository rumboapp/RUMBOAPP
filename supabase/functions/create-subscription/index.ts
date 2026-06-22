// Supabase Edge Function: create-subscription
// Crea una suscripción "pendiente" en Mercado Pago, vinculada a una agencia específica
// mediante external_reference, y devuelve el link de pago (init_point) para redirigir al usuario.
//
// No requiere card_token_id porque se crea como suscripción "sin plan asociado" (status: pending),
// el usuario completa los datos de su tarjeta directamente en el checkout de Mercado Pago.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Precios y nombres de cada plan. Si cambias el precio en Mercado Pago, actualiza también aquí.
const PLAN_CONFIG: Record<string, { amount: number; reason: string }> = {
  premium: { amount: 24990, reason: 'Rumbo - Membresía Premium' },
  pro: { amount: 49990, reason: 'Rumbo - Membresía Pro' },
};

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

    const { agencyId, plan, payerEmail } = await req.json();

    if (!agencyId || !plan || !payerEmail) {
      return new Response(JSON.stringify({ error: 'Faltan datos: agencyId, plan y payerEmail son requeridos' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const planConfig = PLAN_CONFIG[plan];
    if (!planConfig) {
      return new Response(JSON.stringify({ error: 'Plan no válido' }), { status: 400, headers: CORS_HEADERS });
    }

    // Verificamos que la agencia exista de verdad antes de crear nada en Mercado Pago
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agencies')
      .select('id')
      .eq('id', agencyId)
      .single();

    if (agencyError || !agency) {
      return new Response(JSON.stringify({ error: 'Agencia no encontrada' }), { status: 404, headers: CORS_HEADERS });
    }

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: planConfig.reason,
        external_reference: agencyId,
        payer_email: payerEmail,
        back_url: 'https://rumboapp.cl/#/dashboard',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: planConfig.amount,
          currency_id: 'CLP',
        },
        status: 'pending',
      }),
    });

    if (!mpResponse.ok) {
      const errorBody = await mpResponse.text();
      console.error('Error de Mercado Pago al crear la suscripción:', errorBody);
      return new Response(JSON.stringify({ error: 'No se pudo crear la suscripción en Mercado Pago' }), {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    const preapproval = await mpResponse.json();

    // Guardamos de inmediato el ID de la preapproval y marcamos el estado como "pending"
    await supabaseAdmin
      .from('agencies')
      .update({
        mp_preapproval_id: preapproval.id,
        subscription_status: 'pending',
      })
      .eq('id', agencyId);

    return new Response(JSON.stringify({ initPoint: preapproval.init_point }), {
      status: 200,
      headers: CORS_HEADERS,
    });

  } catch (err) {
    console.error('Error inesperado creando la suscripción:', err);
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500, headers: CORS_HEADERS });
  }
});
