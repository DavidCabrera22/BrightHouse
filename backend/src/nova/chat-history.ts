export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Deja el historial empezando por un mensaje del prospecto.
 *
 * El historial sale de la tabla `messages`, que puede empezar con un mensaje de
 * Nova o del asesor —un saludo de difusión, o el asesor escribiendo primero—.
 * Arrancar con el bot hablándole a nadie confunde al modelo y desperdicia
 * contexto, así que esos mensajes de apertura se descartan.
 */
export function normalizeHistory(history: ChatMessage[]): ChatMessage[] {
  const firstUser = history.findIndex((m) => m.role === 'user');
  return firstUser === -1 ? [] : history.slice(firstUser);
}
