import { IsString, IsNotEmpty, IsUUID, IsOptional, IsIn, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const TRIGGER_TYPES = ['lead_created', 'lead_status_changed', 'lead_idle'] as const;
export const ACTION_TYPES = ['send_whatsapp', 'change_lead_status', 'assign_agent'] as const;
export const AUTOMATION_STATUSES = ['active', 'paused', 'draft'] as const;

export class CreateAutomationDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, enum: AUTOMATION_STATUSES })
  @IsIn(AUTOMATION_STATUSES as unknown as string[])
  @IsOptional()
  status?: string;

  @ApiProperty({ enum: TRIGGER_TYPES })
  @IsIn(TRIGGER_TYPES as unknown as string[])
  trigger_type: string;

  @ApiProperty({ required: false, type: Object })
  @IsObject()
  @IsOptional()
  trigger_config?: Record<string, any>;

  @ApiProperty({ enum: ACTION_TYPES })
  @IsIn(ACTION_TYPES as unknown as string[])
  action_type: string;

  @ApiProperty({ required: false, type: Object })
  @IsObject()
  @IsOptional()
  action_config?: Record<string, any>;
}
