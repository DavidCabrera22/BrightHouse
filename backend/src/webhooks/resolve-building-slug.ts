/**
 * De qué edificio habla un webhook entrante.
 *
 * Antes, cuando el webhook llegaba sin `?tenant=`, se respondía como
 * `oasis-park` por defecto. Eso convirtió un despiste de configuración —una URL
 * de webhook actualizada sin su query string— en respuestas equivocadas a
 * prospectos reales: a quien preguntó por Alpes Vista se le contestó que no
 * había información de ese proyecto y se le ofreció otro edificio a
 * $238.000.000. Un prospecto sin respuesta se recupera; uno al que se le negó
 * el proyecto por el que preguntó, mucho menos.
 *
 * Así que ya no se adivina: sin tenant resuelto no se responde. La conversación
 * y el mensaje entrante sí se guardan, y el problema queda en el log con la
 * instrucción de qué configurar.
 */
export interface BuildingResolution {
  /** `undefined` = no se responde a este mensaje. */
  slug?: string;
  /** Qué hay que configurar. Se registra en el log del webhook. */
  problem?: string;
}

export function resolveBuildingSlug(input: {
  /** El tenant ya resuelto contra la base, o `null` si no se encontró. */
  tenant?: { slug: string } | null;
  /** El `?tenant=` que venía en la URL, tal cual. */
  requestedSlug?: string;
}): BuildingResolution {
  const { tenant, requestedSlug } = input;

  // La base manda sobre la URL: el slug guardado es el que casa con el perfil.
  if (tenant?.slug) return { slug: tenant.slug };

  if (requestedSlug) {
    return {
      problem:
        `El webhook llegó con ?tenant=${requestedSlug} y no existe ningún tenant con ese slug. ` +
        'No se responde: revisar la URL configurada en Whapi.',
    };
  }

  return {
    problem:
      'El webhook llegó sin ?tenant= y no se puede saber de qué edificio se trata. ' +
      'No se responde. La URL en Whapi debe terminar en ?tenant=<slug del tenant>.',
  };
}
