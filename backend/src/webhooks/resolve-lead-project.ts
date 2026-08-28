/**
 * A qué proyecto entran los leads que llegan por un webhook.
 *
 * `DEFAULT_PROJECT_ID` del entorno apunta a un edificio concreto. Usarlo como
 * respaldo cuando el tenant sí se resolvió pero no tiene proyecto propio mete
 * al prospecto en la cartera de otra empresa: así fue como un contacto que
 * escribió al WhatsApp de Alpes Vista quedó registrado en Oasis Park. Con un
 * tenant resuelto, solo vale SU proyecto; si no lo hay, no se crea lead —
 * la conversación se guarda igual y Nova responde igual.
 */
export interface TenantForProject {
  id: string;
  slug: string;
  default_project_id?: string | null;
}

export interface LeadProjectResolution {
  /** `undefined` = no se crea lead en este mensaje. */
  projectId?: string;
  /** Qué hay que configurar. Se registra en el log del webhook. */
  problem?: string;
}

export function resolveLeadProject(input: {
  tenant?: TenantForProject | null;
  /** El `default_project_id` del tenant ya leído de la base. `null` si no existe. */
  configuredProject?: { id: string; tenant_id?: string | null } | null;
  /** `DEFAULT_PROJECT_ID`: solo aplica al montaje sin `?tenant=`. */
  envProjectId?: string;
}): LeadProjectResolution {
  const { tenant, configuredProject, envProjectId } = input;

  if (!tenant) {
    // Sin tenant no hay nada que cruzar: es el montaje de un solo edificio,
    // que ya avisa por su cuenta de que está adivinando.
    return { projectId: envProjectId };
  }

  if (!tenant.default_project_id) {
    return {
      problem:
        `El tenant "${tenant.slug}" no tiene default_project_id. No se crea lead: ` +
        'asignarle uno en Tenants → Proyecto por defecto.',
    };
  }

  if (!configuredProject) {
    return {
      problem:
        `El default_project_id del tenant "${tenant.slug}" (${tenant.default_project_id}) ` +
        'no corresponde a ningún proyecto. No se crea lead.',
    };
  }

  if (configuredProject.tenant_id !== tenant.id) {
    return {
      problem:
        `El proyecto ${configuredProject.id} configurado en el tenant "${tenant.slug}" ` +
        'pertenece a otro tenant. No se crea lead.',
    };
  }

  return { projectId: tenant.default_project_id };
}
