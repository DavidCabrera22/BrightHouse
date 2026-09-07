import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';
import { MyDayService } from './my-day.service';
import { CompleteDayItemDto, CreateDayTaskDto } from './my-day.dto';

@ApiTags('Mi día')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'Agent')
@Controller('my-day')
export class MyDayController {
  constructor(private readonly service: MyDayService) {}
  @Get() list(@CurrentTenant() ctx: TenantContext) {
    return this.service.list(ctx);
  }
  @Post('tasks') create(
    @Body() dto: CreateDayTaskDto,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.service.create(dto, ctx);
  }
  @Post('complete') complete(
    @Body() dto: CompleteDayItemDto,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.service.complete(dto.key, ctx);
  }
}
