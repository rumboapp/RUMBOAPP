// Límites de actividades y guías por plan, deben coincidir con los que se
// muestran en el front (ActivitiesView.tsx, GuidesView.tsx, PricingModal.tsx).
export const ACTIVITY_LIMITS: Record<string, number> = { free: 3, premium: 10, pro: 50 };
export const GUIDE_LIMITS: Record<string, number> = { free: 2, premium: 20, pro: 100 };

// Cuando una agencia baja de plan, pausa (active=false) las actividades y
// guías más recientes que excedan el nuevo límite, en lugar de borrarlas.
// Así se evita que alguien suba a Pro, cree 50 actividades, y baje a Free
// conservándolas todas activas. El admin puede reactivarlas manualmente
// (pausando otras) desde la app si vuelve a subir de plan.
export async function enforcePlanLimits(supabaseAdmin: any, agencyId: string, plan: string) {
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
