import {
  BuildingProfile,
  REQUIRED_PRELAUNCH_FIELDS,
  REQUIRED_SELLING_FIELDS,
} from './building-profile';
import { OASIS_PARK } from './oasis-park.building';
import { ALPES_VISTA } from './alpes-vista.building';

/** No hay perfil registrado para ese slug de tenant. */
export class MissingBuildingProfileError extends Error {
  constructor(slug: string) {
    super(`No hay perfil de edificio para el tenant "${slug}"`);
    this.name = 'MissingBuildingProfileError';
  }
}

/** El perfil existe pero le faltan datos del negocio. */
export class IncompleteBuildingProfileError extends Error {
  constructor(slug: string, missing: string[]) {
    super(
      `El perfil "${slug}" está incompleto — faltan: ${missing.join(', ')}`,
    );
    this.name = 'IncompleteBuildingProfileError';
  }
}

/**
 * El slug del tenant y el del perfil se escriben a mano en sitios distintos
 * —uno en la base, otro en el código— y basta un guion de diferencia para que
 * Nova deje de responder. El tenant de Oasis Park está guardado como
 * `oasispark` y su perfil como `oasis-park`: sin normalizar, ese desajuste
 * silencia el bot. Se comparan solo letras y números.
 */
function normalizeSlug(slug: string): string {
  return (slug ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const PROFILES: Record<string, BuildingProfile> = {
  [normalizeSlug(OASIS_PARK.slug)]: OASIS_PARK,
  [normalizeSlug(ALPES_VISTA.slug)]: ALPES_VISTA,
};

/**
 * Qué se le exige a un perfil depende de su etapa: un prelanzamiento no tiene
 * precio ni sala de ventas y exigírselos lo dejaría permanentemente rechazado.
 */
export function assertProfileComplete(profile: BuildingProfile): void {
  const required: string[] =
    profile.stage === 'prelaunch'
      ? (REQUIRED_PRELAUNCH_FIELDS as string[])
      : (REQUIRED_SELLING_FIELDS as string[]);

  const missing = required.filter(
    (field) => String((profile as any)[field] ?? '').trim() === '',
  );
  if (missing.length > 0) {
    throw new IncompleteBuildingProfileError(profile.slug, missing);
  }

  // Un prelanzamiento sin nada confirmado y sin datos que capturar no tendría
  // de qué hablar ni para qué: es un perfil a medio llenar, no uno válido.
  if (profile.stage === 'prelaunch') {
    if (profile.confirmed.length === 0) {
      throw new IncompleteBuildingProfileError(profile.slug, ['confirmed']);
    }
    if (profile.capture.length === 0) {
      throw new IncompleteBuildingProfileError(profile.slug, ['capture']);
    }
  }
}

/**
 * Resuelve el perfil por el slug del tenant. Lanza si no existe o si está
 * incompleto: el llamador debe abstenerse de responder, nunca caer a otro
 * perfil.
 */
export function getBuildingProfile(slug: string): BuildingProfile {
  const key = normalizeSlug(slug);
  const profile = key ? PROFILES[key] : undefined;
  if (!profile) throw new MissingBuildingProfileError(slug);
  assertProfileComplete(profile);
  return profile;
}
