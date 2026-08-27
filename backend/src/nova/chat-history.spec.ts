import { normalizeHistory } from './chat-history';
import { ChatMessage } from './chat-history';

describe('normalizeHistory', () => {
  it('deja intacto un historial que ya empieza con el usuario', () => {
    const history: ChatMessage[] = [
      { role: 'user', content: 'Hola' },
      { role: 'assistant', content: '¡Hola! ¿En qué te ayudo?' },
    ];
    expect(normalizeHistory(history)).toEqual(history);
  });

  it('descarta los mensajes del asistente que abren el historial', () => {
    const history: ChatMessage[] = [
      { role: 'assistant', content: 'Mensaje de difusión' },
      { role: 'assistant', content: 'Segundo mensaje del asesor' },
      { role: 'user', content: 'Hola, me interesa' },
    ];
    expect(normalizeHistory(history)).toEqual([
      { role: 'user', content: 'Hola, me interesa' },
    ]);
  });

  it('devuelve vacío si el historial es todo del asistente', () => {
    const history: ChatMessage[] = [
      { role: 'assistant', content: 'Buenas, le escribo de Oasis Park' },
    ];
    expect(normalizeHistory(history)).toEqual([]);
  });

  it('devuelve vacío para un historial vacío', () => {
    expect(normalizeHistory([])).toEqual([]);
  });
});
