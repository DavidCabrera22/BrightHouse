import { BadRequestException } from '@nestjs/common';
import { assertTransition, isExpired, isEditable, businessToday } from './quote-status';

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

  it('distingue un estado desconocido de uno ya cerrado', () => {
    expect(() => assertTransition('pagada' as any, 'sent')).toThrow(/desconocido/i);
    expect(() => assertTransition('accepted', 'sent')).toThrow(/cerrada/i);
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

  it('maneja un Date sin dar un resultado silenciosamente falso', () => {
    expect(isExpired('sent', new Date('2026-08-25T00:00:00Z'), '2026-08-26')).toBe(true);
    expect(isExpired('sent', new Date('2026-09-25T00:00:00Z'), '2026-08-26')).toBe(false);
  });
});

describe('isEditable', () => {
  it('solo el borrador se edita', () => {
    expect(isEditable('draft')).toBe(true);
    expect(isEditable('sent')).toBe(false);
    expect(isEditable('accepted')).toBe(false);
  });
});

describe('businessToday', () => {
  afterEach(() => jest.useRealTimers());

  it('usa el día de Colombia, no el de UTC', () => {
    // 21:30 del 26 en Bogotá ya es el 27 en UTC.
    jest.useFakeTimers().setSystemTime(new Date('2026-08-27T02:30:00Z'));

    expect(businessToday()).toBe('2026-08-26');
    expect(businessToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isExpired('sent', '2026-08-26')).toBe(false);
  });
});
