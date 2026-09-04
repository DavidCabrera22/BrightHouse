import { NotFoundException } from '@nestjs/common';
import { SaleRegistrationService } from './sale-registration.service';
import { TenantContext } from '../common/tenant';

const ctx = { tenantId: 't1', isSuperAdmin: false } as TenantContext;

const UNIT = {
  id: 'unit-1',
  project_id: 'proj-1',
  current_status_id: 'st-disponible',
};

function build(overrides: { unitsFindOne?: jest.Mock } = {}) {
  const orden: string[] = [];

  const unitsService = {
    findOne:
      overrides.unitsFindOne ??
      jest.fn(async () => {
        orden.push('unit');
        return UNIT;
      }),
    changeStatus: jest.fn(async () => {
      orden.push('status');
      return UNIT;
    }),
  };

  const clientsService = {
    findOrCreateByDocument: jest.fn(async () => {
      orden.push('client');
      return { id: 'client-1' };
    }),
  };

  const salesService = {
    create: jest.fn(async () => {
      orden.push('sale');
      return { id: 'sale-1' };
    }),
    findOne: jest.fn(async () => ({ id: 'sale-1', unit: UNIT })),
  };

  const service = new SaleRegistrationService(
    unitsService as any,
    clientsService as any,
    salesService as any,
  );

  return { service, unitsService, clientsService, salesService, orden };
}

const dto = {
  unit_id: 'unit-1',
  new_status_id: 'st-vendido',
  sale_value: 250_000_000,
  client_name: 'Alicia Oquendo',
  client_document_number: '1047123456',
  client_phone: '573021296623',
  client_email: 'alicia@correo.com',
};

describe('SaleRegistrationService', () => {
  it('escribe en el orden que exige la comisión: cliente, venta y por último el estado', async () => {
    // El estado va al final a propósito. `units.changeStatus` busca la venta de
    // la unidad para calcular la comisión: si el estado cambiara antes, no
    // encontraría nada y la comisión no se crearía, sin error visible.
    const { service, orden } = build();

    await service.register(dto as any, 'user-1', ctx);

    expect(orden).toEqual(['unit', 'client', 'sale', 'status']);
  });

  it('el cliente hereda el proyecto de la unidad, no uno que mande el navegador', async () => {
    const { service, clientsService } = build();

    await service.register(dto as any, 'user-1', ctx);

    expect(clientsService.findOrCreateByDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        document_number: '1047123456',
        name: 'Alicia Oquendo',
        project_id: 'proj-1',
      }),
      ctx,
    );
  });

  it('si la unidad no es del tenant no escribe absolutamente nada', async () => {
    const { service, clientsService, salesService, unitsService } = build({
      unitsFindOne: jest.fn(async () => {
        throw new NotFoundException('Unit with ID unit-1 not found');
      }),
    });

    await expect(service.register(dto as any, 'user-1', ctx)).rejects.toThrow(NotFoundException);

    expect(clientsService.findOrCreateByDocument).not.toHaveBeenCalled();
    expect(salesService.create).not.toHaveBeenCalled();
    expect(unitsService.changeStatus).not.toHaveBeenCalled();
  });

  it('sin asesora indicada, la venta queda a nombre de quien la registra', async () => {
    // De este campo sale el 3% de comisión: atribuirlo mal le paga a otra persona.
    const { service, salesService } = build();

    await service.register(dto as any, 'user-1', ctx);

    expect(salesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ agent_id: 'user-1' }),
      ctx,
    );
  });

  it('respeta la asesora indicada cuando un Admin registra por ella', async () => {
    const { service, salesService } = build();

    await service.register({ ...dto, agent_id: 'diana' } as any, 'admin-1', ctx);

    expect(salesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ agent_id: 'diana' }),
      ctx,
    );
  });

  it('pasa las notas y el estado elegido al cambio de estado', async () => {
    const { service, unitsService } = build();

    await service.register({ ...dto, notes: 'Separación pagada' } as any, 'user-1', ctx);

    expect(unitsService.changeStatus).toHaveBeenCalledWith(
      'unit-1',
      'st-vendido',
      'user-1',
      ctx,
      'Separación pagada',
    );
  });
});
