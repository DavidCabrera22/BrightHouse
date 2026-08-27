import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';

/** `foreign_key_violation` de Postgres. */
const FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async create(createClientDto: CreateClientDto, ctx: TenantContext) {
    await this.tenantScope.assertProjectInTenant(createClientDto.project_id, ctx);
    const client = this.clientRepository.create(createClientDto);
    return this.clientRepository.save(client);
  }

  findAll(ctx: TenantContext, projectId?: string) {
    const qb = this.tenantScope
      .scoped(Client, 'client', ctx)
      .leftJoinAndSelect('client.project', 'project');

    if (projectId) {
      qb.andWhere('client.project_id = :projectId', { projectId });
    }

    return qb.getMany();
  }

  async findOne(id: string, ctx: TenantContext) {
    const client = await this.tenantScope
      .scoped(Client, 'client', ctx)
      .leftJoinAndSelect('client.project', 'project')
      .andWhere('client.id = :id', { id })
      .getOne();

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto, ctx: TenantContext) {
    const client = await this.findOne(id, ctx);
    await this.tenantScope.assertProjectInTenant((updateClientDto as any).project_id, ctx);
    Object.assign(client, updateClientDto);
    return this.clientRepository.save(client);
  }

  async remove(id: string, ctx: TenantContext) {
    const client = await this.findOne(id, ctx);
    try {
      return await this.clientRepository.remove(client);
    } catch (error: any) {
      // Una cotización es el registro de lo que se le ofreció a esta persona:
      // se conserva, y por eso su llave foránea no borra en cascada. Sin este
      // rescate el 23503 de Postgres sale como un 500 sin explicación.
      if (error?.code === FOREIGN_KEY_VIOLATION) {
        throw new ConflictException(
          'No se puede eliminar el cliente porque tiene cotizaciones u otros registros asociados.',
        );
      }
      throw error;
    }
  }
}
