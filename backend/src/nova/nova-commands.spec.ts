import { parseNovaCommand } from './nova-commands';

describe('parseNovaCommand', () => {
  it('reconoce #pausa', () => {
    expect(parseNovaCommand('#pausa')).toBe('pause');
  });

  it('reconoce #nova', () => {
    expect(parseNovaCommand('#nova')).toBe('resume');
  });

  it('reconoce #estado', () => {
    expect(parseNovaCommand('#estado')).toBe('status');
  });

  it('ignora mayúsculas y espacios sobrantes', () => {
    expect(parseNovaCommand('  #PAUSA  ')).toBe('pause');
  });

  it('NO reconoce el comando dentro de una frase', () => {
    // El asesor tiene que poder escribirle esto al cliente sin silenciar el bot.
    expect(parseNovaCommand('hago una #pausa y te confirmo')).toBeNull();
  });

  it('no reconoce la palabra sin el numeral', () => {
    expect(parseNovaCommand('pausa')).toBeNull();
  });

  it('devuelve null para texto normal', () => {
    expect(parseNovaCommand('Buenos días, ya le confirmo')).toBeNull();
  });

  it('devuelve null para vacío o indefinido', () => {
    expect(parseNovaCommand('')).toBeNull();
    expect(parseNovaCommand(undefined as unknown as string)).toBeNull();
  });
});
