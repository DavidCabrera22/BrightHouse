import { BuildingProfile, REQUIRED_PROFILE_FIELDS } from './building-profile';
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

const PROFILES: Record<string, BuildingProfile> = {
  [OASIS_PARK.slug]: OASIS_PARK,
  [ALPES_VISTA.slug]: ALPES_VISTA,
};

export function assertProfileComplete(profile: BuildingProfile): void {
  const missing = REQUIRED_PROFILE_FIELDS.filter(
    (field) => String(profile[field] ?? '').trim() === '',
  );
  if (missing.length > 0) {
    throw new IncompleteBuildingProfileError(profile.slug, missing);
  }
}

/**
 * Resuelve el perfil por el slug del tenant. Lanza si no existe o si está
 * incompleto: el llamador debe abstenerse de responder, nunca caer a otro
 * perfil.
 */
export function getBuildingProfile(slug: string): BuildingProfile {
  const key = (slug ?? '').trim().toLowerCase();
  const profile = PROFILES[key];
  if (!profile) throw new MissingBuildingProfileError(slug);
  assertProfileComplete(profile);
  return profile;
}
