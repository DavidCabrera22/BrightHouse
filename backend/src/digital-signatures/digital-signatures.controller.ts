import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DigitalSignaturesService } from './digital-signatures.service';
import { CreateDigitalSignatureDto } from './dto/create-digital-signature.dto';
import { UpdateDigitalSignatureDto } from './dto/update-digital-signature.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Digital Signatures')
@Controller('digital-signatures')
export class DigitalSignaturesController {
  constructor(private readonly signaturesService: DigitalSignaturesService) {}

  @Post()
  create(@Body() createDto: CreateDigitalSignatureDto) {
    return this.signaturesService.create(createDto);
  }

  @Get()
  findAll() {
    return this.signaturesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.signaturesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateDigitalSignatureDto) {
    return this.signaturesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.signaturesService.remove(id);
  }
}
