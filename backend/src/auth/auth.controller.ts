import { Controller, Post, Get, Body, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import { Public } from './public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Public()
  @Post('login')
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return this.authService.login(user);
  }

  /** Tenants del usuario y cuál está activo en este token. */
  @ApiBearerAuth()
  @Get('tenants')
  async tenants(@Request() req) {
    return {
      active_tenant_id: req.user.tenant_id ?? null,
      tenants: await this.usersService.tenantsFor(req.user.userId),
    };
  }

  @ApiBearerAuth()
  @Post('switch-tenant')
  @ApiBody({ type: SwitchTenantDto })
  switchTenant(@Body() dto: SwitchTenantDto, @Request() req) {
    return this.authService.switchTenant(req.user.userId, dto.tenant_id);
  }
}
