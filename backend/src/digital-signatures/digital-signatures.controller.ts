import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DigitalSignaturesService } from './digital-signatures.service';
import { CreateDigitalSignatureDto } from './dto/create-digital-signature.dto';
import { UpdateDigitalSignatureDto } from './dto/update-digital-signature.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Digital Signatures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('digital-signatures')
export class DigitalSignaturesController {
  constructor(private readonly signaturesService: DigitalSignaturesService) {}

  @Post()
  @Roles('Admin')
  create(@Body() createDto: CreateDigitalSignatureDto, @CurrentTenant() tenant: TenantContext) {
    return this.signaturesService.createForTenant(createDto, tenant);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.signaturesService.findAll(tenant);
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.signaturesService.findOne(id, tenant);
  }

  @Patch(':id')
  @Roles('Admin')
  update(@Param('id') id: string, @Body() updateDto: UpdateDigitalSignatureDto, @CurrentTenant() tenant: TenantContext) {
    return this.signaturesService.update(id, updateDto, tenant);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.signaturesService.remove(id, tenant);
  }
}
