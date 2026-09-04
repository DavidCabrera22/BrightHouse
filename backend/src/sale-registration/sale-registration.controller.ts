import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SaleRegistrationService } from './sale-registration.service';
import { RegisterSaleDto } from './dto/register-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SaleRegistrationController {
  constructor(private readonly saleRegistration: SaleRegistrationService) {}

  @Post('register')
  @Roles('Admin', 'Agent')
  @ApiOperation({
    summary: 'Registra comprador, venta y estado de la unidad en un solo paso',
  })
  register(
    @Body() dto: RegisterSaleDto,
    @Request() req,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.saleRegistration.register(dto, req.user.userId, tenant);
  }
}
