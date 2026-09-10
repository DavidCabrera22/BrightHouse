import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { QuotePdfService } from './quote-pdf.service';
import { Quote } from './entities/quote.entity';
import { QuoteInstallment } from './entities/quote-installment.entity';
import { QuoteReceipt } from './entities/quote-receipt.entity';
import { QuoteReceiptsService } from './quote-receipts.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Quote, QuoteInstallment, QuoteReceipt]), CloudinaryModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuotePdfService, QuoteReceiptsService],
  exports: [QuotesService],
})
export class QuotesModule {}
