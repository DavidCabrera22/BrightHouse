import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { SaleRegistrationController } from './sale-registration.controller';
import { SaleRegistrationService } from './sale-registration.service';
import { SalesController } from '../sales/sales.controller';
import { SalesService } from '../sales/sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

/**
 * `POST /sales/register` convive con el `POST /sales` que ya existía, en dos
 * controladores distintos montados sobre la misma raíz. Nada en el compilador
 * avisa si uno ensombrece al otro: se vería como un 404 en producción, o peor,
 * como una venta creada por el endpoint equivocado.
 *
 * Los guards se sustituyen por pasa-todo: aquí se comprueba el enrutado y la
 * validación del cuerpo, no la autenticación.
 */
describe('POST /sales/register — enrutado', () => {
  let app: INestApplication;
  const register = jest.fn(async () => ({ id: 'sale-1' }));
  const create = jest.fn(async () => ({ id: 'otra-venta' }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SaleRegistrationController, SalesController],
      providers: [
        { provide: SaleRegistrationService, useValue: { register } },
        { provide: SalesService, useValue: { create } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (ctx: any) => {
        ctx.switchToHttp().getRequest().user = { userId: 'user-1', tenant_id: 't1' };
        return true;
      } })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const body = {
    unit_id: '11111111-1111-4111-8111-111111111111',
    new_status_id: '22222222-2222-4222-8222-222222222222',
    sale_value: 250000000,
    client_name: 'Alicia Oquendo',
    client_document_number: '1047123456',
    client_phone: '573021296623',
    client_email: 'alicia@correo.com',
  };

  it('llega al registro completo y no al POST /sales de toda la vida', async () => {
    await request(app.getHttpServer()).post('/api/sales/register').send(body).expect(201);

    expect(register).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rechaza un cuerpo sin cédula antes de tocar nada', async () => {
    const { client_document_number, ...sinCedula } = body;

    await request(app.getHttpServer()).post('/api/sales/register').send(sinCedula).expect(400);
  });

  it('rechaza un correo inválido: la columna no admite nulos y el contrato lo exige', async () => {
    await request(app.getHttpServer())
      .post('/api/sales/register')
      .send({ ...body, client_email: 'no-es-un-correo' })
      .expect(400);
  });
});
