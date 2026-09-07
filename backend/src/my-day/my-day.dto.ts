import {
  IsISO8601,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDayTaskDto {
  @IsUUID() lead_id: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, {
    message: 'due_at debe incluir la zona horaria',
  })
  due_at: string;
}

export class CompleteDayItemDto {
  @IsString() @IsNotEmpty() @MaxLength(250) key: string;
}
