/**
 * Comandos que el asesor escribe en el propio chat de WhatsApp, desde el número
 * del negocio. Solo se interpretan en mensajes con `from_me: true`.
 */
export type NovaCommand = 'pause' | 'resume' | 'status';

const COMMANDS: Record<string, NovaCommand> = {
  '#pausa': 'pause',
  '#nova': 'resume',
  '#estado': 'status',
};

/**
 * Devuelve el comando si el mensaje ES el comando, no si lo contiene: el asesor
 * tiene que poder escribir "hago una #pausa y te confirmo" sin silenciar a Nova.
 */
export function parseNovaCommand(text: string): NovaCommand | null {
  if (!text) return null;
  return COMMANDS[text.trim().toLowerCase()] ?? null;
}
