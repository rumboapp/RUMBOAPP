// Supabase Edge Function: mercadopago-webhook
// Recibe notificaciones de Mercado Pago cuando una suscripción cambia de estado
// (autorizada, cancelada, pago realizado, etc.) y actualiza la agencia correspondiente.

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
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Valida la firma que Mercado Pago envía en el header x-signature.
// Esto confirma que la notificación realmente viene de Mercado Pago y no de un tercero
// que intenta falsificar un aviso de pago.
async function isValidSignature(req: Request, dataId: string): Promise<boolean> {
  const signatureHeader = req.headers.get('x-signature');
  const requestIdHeader = req.headers.get('x-request-id');
  if (!signatureHeader || !requestIdHeader) return false;

  // El header viene como "ts=170000000,v1=abc123..."
  const parts = Object.fromEntries(
    signatureHeader.split(',').map(p => {
      const [key, value] = p.split('=');
      return [key.trim(), value?.trim()];
    })
  );
  const ts = parts['ts'];
  const receivedHash = parts['v1'];
  if (!ts || !receivedHash) return false;

  // El "manifest" que Mercado Pago firma sigue este formato exacto
  const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${ts};`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(MP_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const computedHash = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedHash === receivedHash;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await req.json();
    console.log('Webhook recibido de Mercado Pago:', JSON.stringify(body));

    const topic = body.type || body.topic;
    const preapprovalId = body.data?.id || body.id;

    if (!preapprovalId) {
      return new Response(JSON.stringify({ error: 'Falta el ID de la suscripción' }), { status: 400 });
    }

    // Validamos la autenticidad de la notificación antes de hacer nada más.
    const validSignature = await isValidSignature(req, String(preapprovalId));
    if (!validSignature) {
      console.error('Firma inválida, posible notificación falsa. Se rechaza.');
      return new Response(JSON.stringify({ error: 'Firma inválida' }), { status: 401 });
    }

    if (topic !== 'preapproval' && topic !== 'subscription_preapproval') {
      // No es una notificación de suscripción, la ignoramos sin error
      return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
    }

    // SIEMPRE reconsultamos el estado real a la API de Mercado Pago.
    // Nunca confiamos ciegamente en el contenido del webhook, ya que podría ser falsificado.
    const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      console.error('Error consultando preapproval en Mercado Pago:', await mpResponse.text());
      return new Response(JSON.stringify({ error: 'No se pudo verificar la suscripción' }), { status: 502 });
    }

    const preapproval = await mpResponse.json();
    // preapproval.status puede ser: pending, authorized, paused, cancelled
    // preapproval.external_reference contiene el ID de nuestra agencia (lo configuramos al crear la suscripción)
    const agencyId = preapproval.external_reference;
    const mpStatus = preapproval.status;
    const amount = preapproval.auto_recurring?.transaction_amount;
    // Identificamos el plan por el monto exacto cobrado, no por texto libre (más confiable)
    const planId = amount >= 49990 ? 'pro' : 'premium';

    if (!agencyId) {
      console.error('La suscripción no tiene external_reference, no se puede vincular a una agencia.');
      return new Response(JSON.stringify({ error: 'Sin referencia de agencia' }), { status: 400 });
    }

    // Mapeamos el estado de Mercado Pago a nuestro plan interno
    let subscriptionPlan = 'free';
    let subscriptionStatus = 'free';

    if (mpStatus === 'authorized') {
      subscriptionPlan = planId;
      subscriptionStatus = 'authorized';
    } else if (mpStatus === 'pending') {
      subscriptionPlan = 'free'; // Aún no confirmado, no otorgamos el plan todavía
      subscriptionStatus = 'pending';
    } else if (mpStatus === 'cancelled' || mpStatus === 'paused') {
      subscriptionPlan = 'free';
      subscriptionStatus = 'cancelled';
    }

    const { error: updateError } = await supabaseAdmin
      .from('agencies')
      .update({
        subscription_plan: subscriptionPlan,
        subscription_status: subscriptionStatus,
        mp_preapproval_id: preapprovalId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agencyId);

    if (updateError) {
      console.error('Error actualizando agencia:', updateError);
      return new Response(JSON.stringify({ error: 'Error al actualizar la agencia' }), { status: 500 });
    }

    // Si el plan bajó (o quedó en free por cancelación/pausa), pausamos el
    // excedente de actividades/guías por sobre el nuevo límite, para evitar
    // que se aproveche un plan superior temporal y se conserve el cupo extra.
    await enforcePlanLimits(supabaseAdmin, agencyId, subscriptionPlan);

    console.log(`Agencia ${agencyId} actualizada: plan=${subscriptionPlan} status=${subscriptionStatus}`);
    return new Response(JSON.stringify({ received: true, agencyId, subscriptionPlan, subscriptionStatus }), { status: 200 });

  } catch (err) {
    console.error('Error inesperado en el webhook:', err);
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
  }
});
