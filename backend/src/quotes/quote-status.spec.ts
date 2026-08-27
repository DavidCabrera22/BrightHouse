import { BadRequestException } from '@nestjs/common';
import { assertTransition, isExpired, isEditable } from './quote-status';

describe('assertTransition', () => {
  it('permite el camino normal', () => {
    expect(() => assertTransition('draft', 'sent')).not.toThrow();
    expect(() => assertTransition('sent', 'accepted')).not.toThrow();
    expect(() => assertTransition('sent', 'rejected')).not.toThrow();
  });

  it('rechaza saltarse el envío', () => {
    expect(() => assertTransition('draft', 'accepted')).toThrow(BadRequestException);
  });

  it('rechaza revivir una cotización cerrada', () => {
    expect(() => assertTransition('accepted', 'sent')).toThrow(BadRequestException);
    expect(() => assertTransition('rejected', 'draft')).toThrow(BadRequestException);
  });

  it('rechaza un estado inexistente', () => {
    expect(() => assertTransition('draft', 'pagada' as any)).toThrow(BadRequestException);
  });
});

describe('isExpired', () => {
  it('vence solo las enviadas con fecha pasada', () => {
    expect(isExpired('sent', '2026-08-25', '2026-08-26')).toBe(true);
    expect(isExpired('sent', '2026-08-26', '2026-08-26')).toBe(false);
    expect(isExpired('sent', '2026-09-10', '2026-08-26')).toBe(false);
  });

  it('no vence borradores ni cotizaciones ya cerradas', () => {
    expect(isExpired('draft', '2026-01-01', '2026-08-26')).toBe(false);
    expect(isExpired('accepted', '2026-01-01', '2026-08-26')).toBe(false);
    expect(isExpired('rejected', '2026-01-01', '2026-08-26')).toBe(false);
  });

  it('no vence cuando no hay fecha de vigencia', () => {
    expect(isExpired('sent', null, '2026-08-26')).toBe(false);
  });
});

describe('isEditable', () => {
  it('solo el borrador se edita', () => {
    expect(isEditable('draft')).toBe(true);
    expect(isEditable('sent')).toBe(false);
    expect(isEditable('accepted')).toBe(false);
  });
});
