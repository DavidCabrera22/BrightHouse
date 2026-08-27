import { extractMessages } from './extract-messages';

const CLIENTE = '573001234567';
const CHAT = `${CLIENTE}@s.whatsapp.net`;

function whapi(...msgs: any[]) {
  return { messages: msgs, contacts: [{ id: CLIENTE, name: 'Ana' }] };
}

describe('extractMessages — formato Whapi', () => {
  it('toma un mensaje entrante de texto', () => {
    const { messages } = extractMessages(
      whapi({ id: 'm1', from: CLIENTE, type: 'text', text: { body: 'Hola' } }),
    );
    expect(messages).toEqual([
      {
        from: CLIENTE,
        messageId: 'm1',
        text: 'Hola',
        profileName: 'Ana',
        fromMe: false,
        type: 'text',
      },
    ]);
  });

  it('descarta un entrante que no es texto: Nova no puede responderlo', () => {
    const { messages } = extractMessages(
      whapi({ id: 'm1', from: CLIENTE, type: 'image' }),
    );
    expect(messages).toEqual([]);
  });

  // ── El eco de la propia Nova ───────────────────────────────────────────────

  it('DESCARTA el eco de un mensaje enviado por la API', () => {
    // Whapi reenvía lo que mandamos por su API con from_me: true. Tomarlo por
    // un mensaje del asesor haría que Nova se pause después de cada respuesta.
    const { messages } = extractMessages(
      whapi({
        id: 'm1',
        from_me: true,
        source: 'api',
        chat_id: CHAT,
        type: 'text',
        text: { body: 'Hola, soy Nova' },
      }),
    );
    expect(messages).toEqual([]);
  });

  it('descarta los eventos del sistema', () => {
    const { messages } = extractMessages(
      whapi({ id: 'm1', from_me: true, source: 'system', chat_id: CHAT, type: 'text' }),
    );
    expect(messages).toEqual([]);
  });

  it('descarta un saliente sin `source` y lo cuenta para poder diagnosticarlo', () => {
    const res = extractMessages(
      whapi({ id: 'm1', from_me: true, chat_id: CHAT, type: 'text', text: { body: 'x' } }),
    );
    expect(res.messages).toEqual([]);
    expect(res.outgoingWithoutSource).toBe(1);
  });

  // ── El asesor de verdad ────────────────────────────────────────────────────

  it('toma un mensaje que el asesor escribió desde el celular', () => {
    const { messages } = extractMessages(
      whapi({
        id: 'm1',
        from_me: true,
        source: 'mobile',
        chat_id: CHAT,
        type: 'text',
        text: { body: 'Ya le confirmo' },
      }),
    );
    expect(messages[0]).toMatchObject({
      from: CLIENTE,
      text: 'Ya le confirmo',
      fromMe: true,
      type: 'text',
    });
  });

  it('toma también WhatsApp Web y escritorio', () => {
    const { messages } = extractMessages(
      whapi(
        { id: 'm1', from_me: true, source: 'web', chat_id: CHAT, type: 'text', text: { body: 'a' } },
        { id: 'm2', from_me: true, source: 'desktop', chat_id: CHAT, type: 'text', text: { body: 'b' } },
      ),
    );
    expect(messages).toHaveLength(2);
  });

  it('toma la nota de voz del asesor: también significa que tomó el control', () => {
    const { messages } = extractMessages(
      whapi({ id: 'm1', from_me: true, source: 'mobile', chat_id: CHAT, type: 'voice' }),
    );
    expect(messages[0]).toMatchObject({ from: CLIENTE, fromMe: true, type: 'voice', text: '' });
  });

  it('saca el teléfono de chat_id, no de from: en los salientes `from` es el negocio', () => {
    const { messages } = extractMessages(
      whapi({
        id: 'm1',
        from_me: true,
        source: 'mobile',
        from: '573159999999', // el número del negocio
        chat_id: CHAT,
        type: 'text',
        text: { body: 'hola' },
      }),
    );
    expect(messages[0].from).toBe(CLIENTE);
  });

  // ── Chats que no son 1:1 ───────────────────────────────────────────────────

  it('descarta los mensajes a grupos: su chat_id no es un teléfono', () => {
    const { messages } = extractMessages(
      whapi({
        id: 'm1',
        from_me: true,
        source: 'mobile',
        chat_id: '120363012345678901@g.us',
        type: 'text',
        text: { body: 'hola equipo' },
      }),
    );
    expect(messages).toEqual([]);
  });

  it('descarta los estados', () => {
    const { messages } = extractMessages(
      whapi({
        id: 'm1',
        from_me: true,
        source: 'mobile',
        chat_id: 'status@broadcast',
        type: 'text',
      }),
    );
    expect(messages).toEqual([]);
  });
});

describe('extractMessages — formato Meta Cloud API', () => {
  it('toma los entrantes de texto y nunca marca fromMe', () => {
    const { messages } = extractMessages({
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: 'Ana' } }],
                messages: [{ id: 'm1', from: CLIENTE, type: 'text', text: { body: 'Hola' } }],
              },
            },
          ],
        },
      ],
    });
    expect(messages[0]).toMatchObject({ from: CLIENTE, profileName: 'Ana', fromMe: false });
  });
});

describe('extractMessages — cuerpos vacíos o malformados', () => {
  it.each([{}, null, undefined, { messages: [] }, { entry: [] }])(
    'devuelve una lista vacía sin lanzar (%#)',
    (body) => {
      expect(extractMessages(body).messages).toEqual([]);
    },
  );
});
