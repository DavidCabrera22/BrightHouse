import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { QuotePdfService } from './quote-pdf.service';
import { Quote } from './entities/quote.entity';
import { QuoteInstallment } from './entities/quote-installment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quote, QuoteInstallment])],
  controllers: [QuotesController],
  providers: [QuotesService, QuotePdfService],
  exports: [QuotesService],
})
export class QuotesModule {}
