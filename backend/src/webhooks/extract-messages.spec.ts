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

describe('extractMessages — contactos por LID', () => {
  // Payloads reales capturados del canal de Alpes Vista.
  const LID = '209238039240829@lid';

  it('conserva el LID completo: es la dirección para responder', () => {
    const { messages } = extractMessages({
      messages: [{
        id: 'Os9rARrNqNG7Vw', type: 'text', from_me: false, source: 'mobile',
        chat_id: LID, from: LID, text: { body: 'Hola' }, from_name: '𓆰𓆪',
      }],
    });
    // Recortar el sufijo daría `<lid>@s.whatsapp.net`, un destino inválido.
    expect(messages[0].from).toBe(LID);
    expect(messages[0].profileName).toBe('𓆰𓆪');
  });

  it('un contacto normal sí queda como teléfono suelto', () => {
    const { messages } = extractMessages({
      messages: [{
        id: 'OsSQwM8', type: 'text', from_me: false, source: 'mobile',
        chat_id: '573045769548@s.whatsapp.net', from: '573045769548',
        text: { body: 'Buenas noches' }, from_name: 'Luisa Fernanda',
      }],
    });
    expect(messages[0].from).toBe('573045769548');
    expect(messages[0].profileName).toBe('Luisa Fernanda');
  });

  it('el asesor también puede tomar el control de un chat por LID', () => {
    const { messages } = extractMessages({
      messages: [{
        id: 'x1', type: 'text', from_me: true, source: 'mobile',
        chat_id: LID, from: '573045903200', text: { body: 'yo te atiendo' },
      }],
    });
    expect(messages[0]).toMatchObject({ from: LID, fromMe: true });
  });

  it('prefiere from_name sobre el arreglo de contactos', () => {
    const { messages } = extractMessages({
      messages: [{
        id: 'x2', type: 'text', from_me: false, source: 'mobile',
        chat_id: '573001112233@s.whatsapp.net', from: '573001112233',
        text: { body: 'hola' }, from_name: 'Nombre del mensaje',
      }],
      contacts: [{ id: '573001112233', name: 'Nombre viejo del contacto' }],
    });
    expect(messages[0].profileName).toBe('Nombre del mensaje');
  });

  it('sigue descartando historias y estados', () => {
    const { messages } = extractMessages({
      messages: [{ id: 'x3', type: 'story', from_me: false, chat_id: 'stories', from: '573174255040' }],
    });
    expect(messages).toEqual([]);
  });
});
