import { Injectable, Logger } from '@nestjs/common';
import { UnitsService } from '../units/units.service';
import { ClientsService } from '../clients/clients.service';
import { SalesService } from '../sales/sales.service';
import { RegisterSaleDto } from './dto/register-sale.dto';
import { TenantContext } from '../common/tenant';

/**
 * Cierra una venta completa: comprador, venta y estado de la unidad.
 *
 * Existe porque los tres pasos tienen que ocurrir en un orden exacto y hasta
 * ahora nadie lo garantizaba. `units.changeStatus` calcula la comisión buscando
 * la venta de esa unidad; si el estado se cambia antes de que la venta exista,
 * no encuentra nada y la comisión no se crea — sin error, sin aviso y sin nada
 * que lo delate salvo revisar la base. Dejar ese orden en manos del navegador
 * es volver a introducir el mismo fallo con mejor apariencia.
 *
 * Vive en su propio módulo y no dentro de `SalesModule` porque `UnitsModule` ya
 * importa `SalesModule`: meter aquí la dependencia inversa obligaría a un
 * `forwardRef` en ambos lados.
 */
@Injectable()
export class SaleRegistrationService {
  private readonly logger = new Logger(SaleRegistrationService.name);

  constructor(
    private readonly unitsService: UnitsService,
    private readonly clientsService: ClientsService,
    private readonly salesService: SalesService,
  ) {}

  async register(dto: RegisterSaleDto, userId: string, ctx: TenantContext) {
    // 1. La unidad, primero. Va scopeada al tenant, así que una unidad ajena
    //    corta aquí y ninguno de los pasos siguientes llega a escribir.
    const unit = await this.unitsService.findOne(dto.unit_id, ctx);

    // 2. El comprador, identificado por cédula: quien ya compró antes no se
    //    duplica, y un reintento no choca contra el índice único.
    const client = await this.clientsService.findOrCreateByDocument(
      {
        name: dto.client_name,
        document_number: dto.client_document_number,
        phone: dto.client_phone,
        email: dto.client_email,
        project_id: unit.project_id,
      },
      ctx,
    );

    // 3. La venta. `agent_id` decide de quién es el 3% de comisión.
    const sale = await this.salesService.create(
      {
        unit_id: dto.unit_id,
        client_id: client.id,
        agent_id: dto.agent_id ?? userId,
        sale_value: dto.sale_value,
      },
      ctx,
    );

    // 4. Y solo ahora el estado, que es lo que dispara comisión, historial y
    //    firma. Si esto falla, el cliente y la venta quedan creados: es un
    //    estado recuperable desde Proyectos → Unidades, y la comisión se genera
    //    en cuanto alguien corrija el estado allí.
    try {
      await this.unitsService.changeStatus(
        dto.unit_id,
        dto.new_status_id,
        userId,
        ctx,
        dto.notes,
      );
    } catch (err) {
      this.logger.error(
        `Venta ${sale.id} registrada pero la unidad ${dto.unit_id} no cambió de estado: ` +
          `${err?.message}. Corregir el estado en Unidades genera la comisión.`,
      );
      throw err;
    }

    return this.salesService.findOne(sale.id, ctx);
  }
}
