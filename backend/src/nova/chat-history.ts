export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * La API de Anthropic exige que el primer mensaje sea del `user`. El historial
 * viene de la tabla `messages`, que puede empezar con un mensaje de Nova o del
 * asesor —un saludo de difusión, o el asesor escribiendo primero—. Esos
 * mensajes de apertura se descartan.
 */
export function normalizeHistory(history: ChatMessage[]): ChatMessage[] {
  const firstUser = history.findIndex((m) => m.role === 'user');
  return firstUser === -1 ? [] : history.slice(firstUser);
}
