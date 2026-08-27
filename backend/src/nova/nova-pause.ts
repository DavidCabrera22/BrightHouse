/** Lo que hace falta de una conversación para decidir la reactivación. */
export interface PauseState {
  nova_paused: boolean;
  nova_paused_at: Date | null;
  nova_paused_by: string | null;
}

export const DEFAULT_RESUME_HOURS = 12;

/**
 * ¿Debe Nova retomar el control de esta conversación?
 *
 * La ventana se mide desde `nova_paused_at`, que se reescribe con cada mensaje
 * del asesor: mientras el asesor esté activo en el chat, Nova no se mete.
 *
 * Una conversación escalada por Nova (`nova_paused_by === 'nova'`) no se
 * reactiva sola nunca: solo con `#nova` o con el botón del CRM.
 */
export function shouldAutoResume(
  conv: PauseState,
  now: Date,
  resumeHours: number,
): boolean {
  if (!conv.nova_paused) return false;
  if (conv.nova_paused_by === 'nova') return false;
  if (!conv.nova_paused_at) return false;

  const elapsedMs = now.getTime() - new Date(conv.nova_paused_at).getTime();
  return elapsedMs >= resumeHours * 3600_000;
}
