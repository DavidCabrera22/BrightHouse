import {
  getBuildingProfile,
  IncompleteBuildingProfileError,
  MissingBuildingProfileError,
  assertProfileComplete,
} from './building-registry';
import { BuildingProfile, PrelaunchBuilding } from './building-profile';
import { OASIS_PARK } from './oasis-park.building';

describe('building-registry', () => {
  it('devuelve el perfil de Oasis Park por su slug', () => {
    expect(getBuildingProfile('oasis-park').building_name).toBe('Oasis Park');
  });

  it('ignora mayúsculas y espacios en el slug', () => {
    expect(getBuildingProfile('  Oasis-Park  ').slug).toBe('oasis-park');
  });

  it('lanza MissingBuildingProfileError si el slug no existe', () => {
    expect(() => getBuildingProfile('no-existe')).toThrow(
      MissingBuildingProfileError,
    );
  });

  it('lanza MissingBuildingProfileError si el slug viene vacío', () => {
    expect(() => getBuildingProfile('')).toThrow(MissingBuildingProfileError);
  });

  it('lanza IncompleteBuildingProfileError si falta un campo obligatorio', () => {
    const incompleto: BuildingProfile = { ...OASIS_PARK, sales_room: '' };
    expect(() => assertProfileComplete(incompleto)).toThrow(
      IncompleteBuildingProfileError,
    );
  });

  it('el mensaje del error nombra el campo que falta', () => {
    const incompleto: BuildingProfile = { ...OASIS_PARK, whatsapp_contact: '  ' };
    expect(() => assertProfileComplete(incompleto)).toThrow(/whatsapp_contact/);
  });

  it('acepta un perfil completo', () => {
    expect(() => assertProfileComplete(OASIS_PARK)).not.toThrow();
  });

  it('acepta Alpes Vista, que está en prelanzamiento y no necesita precio ni sala de ventas', () => {
    const perfil = getBuildingProfile('alpes-vista');
    expect(perfil.stage).toBe('prelaunch');
    expect(perfil.building_name).toBe('Alpes Vista');
  });

  it('rechaza un prelanzamiento sin nada confirmado: no tendría de qué hablar', () => {
    const alpes = getBuildingProfile('alpes-vista') as PrelaunchBuilding;
    expect(() =>
      assertProfileComplete({ ...alpes, confirmed: [] }),
    ).toThrow(IncompleteBuildingProfileError);
  });

  it('rechaza un prelanzamiento sin datos que capturar: no tendría objetivo', () => {
    const alpes = getBuildingProfile('alpes-vista') as PrelaunchBuilding;
    expect(() => assertProfileComplete({ ...alpes, capture: [] })).toThrow(
      IncompleteBuildingProfileError,
    );
  });

  it('a un prelanzamiento NO le exige la sala de ventas', () => {
    // Exigírsela lo dejaría rechazado para siempre: todavía no existe.
    const alpes = getBuildingProfile('alpes-vista') as PrelaunchBuilding;
    expect(() => assertProfileComplete(alpes)).not.toThrow();
  });
});
