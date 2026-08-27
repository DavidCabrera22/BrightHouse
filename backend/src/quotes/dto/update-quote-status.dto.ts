import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuoteStatus } from '../quote-status';

export class UpdateQuoteStatusDto {
  @ApiProperty({ enum: ['sent', 'accepted', 'rejected'] })
  @IsIn(['sent', 'accepted', 'rejected'])
  status: QuoteStatus;
}
