import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

/**
 * Quién puede tocar el inventario.
 *
 * `UnitsController` era el único controlador del sistema sin `RolesGuard`: solo
 * exigía estar autenticado, así que cualquier asesora podía borrar un
 * apartamento. Y el guard por sí solo no basta —`if (!requiredRoles) return
 * true`—, hace falta un `@Roles` por ruta. Esta prueba fija ambas cosas.
 *
 * El inventario lo gestiona la dirección. Un asesor solo mueve el estado de una
 * unidad, que es lo que necesita para cerrar una venta.
 */
describe('UnitsController — permisos', () => {
  let app: INestApplication;

  const unitsService = {
    create: jest.fn(async () => ({ id: 'u1' })),
    findAll: jest.fn(async () => []),
    findOne: jest.fn(async () => ({ id: 'u1' })),
    update: jest.fn(async () => ({ id: 'u1' })),
    changeStatus: jest.fn(async () => ({ id: 'u1' })),
    remove: jest.fn(async () => ({ id: 'u1' })),
  };

  /** El rol viaja en una cabecera para poder pedir la misma ruta como cada uno. */
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UnitsController],
      providers: [{ provide: UnitsService, useValue: unitsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = {
            userId: 'user-1',
            role: req.headers['x-rol'],
            tenant_id: 'tenant-alpes',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const como = (rol: string) => (req: request.Test) => req.set('x-rol', rol);

  describe('un Agent', () => {
    const agent = como('Agent');

    it('ve el inventario', async () => {
      await agent(request(app.getHttpServer()).get('/units')).expect(200);
      await agent(request(app.getHttpServer()).get('/units/u1')).expect(200);
    });

    it('cambia el estado de una unidad: lo necesita para cerrar una venta', async () => {
      await agent(
        request(app.getHttpServer()).patch('/units/u1/status').send({ new_status_id: 'st-1' }),
      ).expect(200);
    });

    it('NO crea unidades', async () => {
      await agent(request(app.getHttpServer()).post('/units').send({ code: 'A-101' })).expect(403);
    });

    it('NO edita unidades', async () => {
      await agent(request(app.getHttpServer()).patch('/units/u1').send({ price: 1 })).expect(403);
    });

    it('NO borra apartamentos del inventario', async () => {
      await agent(request(app.getHttpServer()).delete('/units/u1')).expect(403);
    });
  });

  describe('un Admin', () => {
    const admin = como('Admin');

    it('gestiona el inventario entero', async () => {
      await admin(request(app.getHttpServer()).post('/units').send({ code: 'A-101' })).expect(201);
      await admin(request(app.getHttpServer()).patch('/units/u1').send({ price: 1 })).expect(200);
      await admin(request(app.getHttpServer()).delete('/units/u1')).expect(200);
    });
  });

  it('un SuperAdmin pasa por encima de todo, como en el resto del sistema', async () => {
    await como('SuperAdmin')(request(app.getHttpServer()).delete('/units/u1')).expect(200);
  });

  it('un rol desconocido no entra', async () => {
    await como('Curioso')(request(app.getHttpServer()).delete('/units/u1')).expect(403);
  });
});
