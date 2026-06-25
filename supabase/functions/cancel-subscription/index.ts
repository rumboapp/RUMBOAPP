// Supabase Edge Function: cancel-subscription
// Cancela la suscripción activa de una agencia en Mercado Pago y actualiza su plan a "free".
// Esto evita que sigan cobrando a una agencia que decidió volver al plan gratuito desde la app.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Límites de actividades y guías por plan, deben coincidir con los que se
// muestran en el front (ActivitiesView.tsx, GuidesView.tsx, PricingModal.tsx).
const ACTIVITY_LIMITS: Record<string, number> = { free: 3, premium: 10, pro: 50 };
const GUIDE_LIMITS: Record<string, number> = { free: 2, premium: 20, pro: 100 };

// Cuando una agencia baja de plan, pausa (active=false) las actividades y
// guías más recientes que excedan el nuevo límite, en lugar de borrarlas.
// Así se evita que alguien suba a Pro, cree 50 actividades, y baje a Free
// conservándolas todas activas. El admin puede reactivarlas manualmente
// (pausando otras) desde la app si vuelve a subir de plan.
async function enforcePlanLimits(supabaseAdmin: any, agencyId: string, plan: string) {
  const activityLimit = ACTIVITY_LIMITS[plan] ?? ACTIVITY_LIMITS.free;
  const guideLimit = GUIDE_LIMITS[plan] ?? GUIDE_LIMITS.free;

  const { data: activities } = await supabaseAdmin
    .from('activities')
    .select('id, created_at')
    .eq('agency_id', agencyId)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (activities && activities.length > activityLimit) {
    const idsToDeactivate = activities.slice(0, activities.length - activityLimit).map((a: any) => a.id);
    await supabaseAdmin.from('activities').update({ active: false }).in('id', idsToDeactivate);
  }

  const { data: guides } = await supabaseAdmin
    .from('guides')
    .select('id, created_at')
    .eq('agency_id', agencyId)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (guides && guides.length > guideLimit) {
    const idsToDeactivate = guides.slice(0, guides.length - guideLimit).map((g: any) => g.id);
    await supabaseAdmin.from('guides').update({ active: false }).in('id', idsToDeactivate);
  }
}

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
      await enforcePlanLimits(supabaseAdmin, agencyId, 'free');
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
    await enforcePlanLimits(supabaseAdmin, agencyId, 'free');

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('Error inesperado cancelando la suscripción:', err);
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500, headers: CORS_HEADERS });
  }
});
