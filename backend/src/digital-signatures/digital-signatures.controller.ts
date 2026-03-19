import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DigitalSignaturesService } from './digital-signatures.service';
import { CreateDigitalSignatureDto } from './dto/create-digital-signature.dto';
import { UpdateDigitalSignatureDto } from './dto/update-digital-signature.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Digital Signatures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('digital-signatures')
export class DigitalSignaturesController {
  constructor(private readonly signaturesService: DigitalSignaturesService) {}

  @Post()
  @Roles('Admin')
  create(@Body() createDto: CreateDigitalSignatureDto) {
    return this.signaturesService.create(createDto);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll() {
    return this.signaturesService.findAll();
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string) {
    return this.signaturesService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin')
  update(@Param('id') id: string, @Body() updateDto: UpdateDigitalSignatureDto) {
    return this.signaturesService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string) {
    return this.signaturesService.remove(id);
  }
}
