import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Roles('Admin', 'Agent')
  create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll(@Request() req) {
    return this.leadsService.findAll(req.user?.tenant_id);
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin', 'Agent')
  update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
    return this.leadsService.update(id, updateLeadDto);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }

  @Post(':id/suggest')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Get AI-powered next action suggestion for a lead' })
  getSuggestion(@Param('id') id: string) {
    return this.leadsService.getSuggestion(id);
  }

  @Post('admin/recalculate-scores')
  @Roles('Admin')
  @ApiOperation({ summary: 'Recalculate AI scores for all leads' })
  async recalculateScores() {
    const count = await this.leadsService.recalculateAllScores();
    return { updated: count };
  }
}
