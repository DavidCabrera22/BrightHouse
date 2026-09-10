import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Quote } from './entities/quote.entity';

const money = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const CONCEPT_LABEL: Record<string, string> = {
  separacion: 'Separación',
  cuota: 'Cuota inicial',
  extra: 'Abono extra',
  saldo: 'Saldo crédito',
};

const date = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

@Injectable()
export class QuotePdfService {
  /**
   * Arma el PDF en memoria (son unos pocos KB) y lo devuelve. No se guarda en
   * disco ni en Cloudinary: así no hay archivo que se desincronice de los datos.
   */
  async render(quote: Quote): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    this.header(doc, quote);
    this.parties(doc, quote);
    this.summary(doc, quote);
    this.schedule(doc, quote);
    this.footer(doc, quote);

    doc.end();
    return done;
  }

  private header(doc: PDFKit.PDFDocument, quote: Quote) {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(quote.project?.name ?? 'Cotización');
    doc.fontSize(10).font('Helvetica').fillColor('#555');
    if (quote.project?.location) doc.text(quote.project.location);
    doc.moveDown(0.5);
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text(`Cotización ${quote.code}`);
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Fecha: ${date(quote.quote_date)}`);
    doc.moveDown();
  }

  private parties(doc: PDFKit.PDFDocument, quote: Quote) {
    doc.fontSize(11).font('Helvetica-Bold').text('Cliente');
    doc.fontSize(10).font('Helvetica');
    doc.text(`${quote.client?.name ?? ''}   C.C. ${quote.client?.document_number ?? ''}`);
    doc.text(`${quote.client?.phone ?? ''}   ${quote.client?.email ?? ''}`);
    doc.moveDown(0.7);

    doc.fontSize(11).font('Helvetica-Bold').text('Unidad');
    doc.fontSize(10).font('Helvetica');
    const unit = quote.unit;
    doc.text(
      `${unit?.code ?? ''}   Torre ${unit?.tower ?? '-'}   Piso ${unit?.floor ?? '-'}   ` +
        `${unit?.area ?? '-'} m²${unit?.unit_type ? `   ${unit.unit_type}` : ''}`,
    );
    doc.moveDown();
  }

  private summary(doc: PDFKit.PDFDocument, quote: Quote) {
    const rows: [string, string][] = [
      ['Precio de la unidad', money(quote.unit_price)],
      ['Descuento', money(quote.discount)],
      ['Valor total', money(quote.total_value)],
      ['Separación', money(quote.reservation_amount)],
      [`Cuota inicial (${Number(quote.down_payment_percent)}%)`, money(quote.down_payment_value)],
      quote.payment_plan === 'custom'
        ? ['Plan de pagos', 'Personalizado: ver cronograma']
        : ['Cuota mensual base', money(quote.installment_amount)],
      [
        'Abonos extra pactados',
        money(
          (quote.installments ?? [])
            .filter((i) => i.concept === 'extra')
            .reduce((sum, i) => sum + i.amount, 0),
        ),
      ],
      ['Saldo con crédito hipotecario', money(quote.balance_value)],
    ];

    doc.fontSize(11).font('Helvetica-Bold').text('Resumen');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');

    for (const [label, value] of rows) {
      const y = doc.y;
      doc.text(label, 50, y);
      doc.text(value, 350, y, { width: 200, align: 'right' });
    }
    doc.moveDown();
  }

  private schedule(doc: PDFKit.PDFDocument, quote: Quote) {
    doc.x = 50;
    doc.fontSize(11).font('Helvetica-Bold').text('Plan de pagos');
    doc.moveDown(0.3);

    const tableHeader = () => {
      const head = doc.y;
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('#', 50, head);
      doc.text('Concepto', 80, head);
      doc.text('Vencimiento', 240, head);
      doc.text('Valor', 350, head, { width: 200, align: 'right' });
      doc
        .moveTo(50, doc.y + 2)
        .lineTo(550, doc.y + 2)
        .strokeColor('#cccccc')
        .stroke();
      doc.moveDown(0.5).font('Helvetica');
    };
    tableHeader();

    doc.font('Helvetica');
    for (const installment of quote.installments ?? []) {
      if (doc.y > 700) {
        doc.addPage();
        tableHeader();
      }
      const y = doc.y;
      doc.text(String(installment.number), 50, y);
      doc.text(CONCEPT_LABEL[installment.concept] ?? installment.concept, 80, y);
      doc.text(date(installment.due_date), 240, y);
      doc.text(money(installment.amount), 350, y, {
        width: 200,
        align: 'right',
      });
    }
    doc.moveDown();
  }

  private footer(doc: PDFKit.PDFDocument, quote: Quote) {
    doc.x = 50;
    if (quote.notes) {
      doc.moveDown(0.5).fontSize(9).font('Helvetica-Oblique').fillColor('#333').text(quote.notes);
    }
    doc.moveDown(0.8);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
    doc.text(`Válida hasta ${date(quote.valid_until)}`);
    doc.moveDown(0.3);
    doc.font('Helvetica').fillColor('#666').fontSize(8);
    doc.text(
      'Esta cotización es informativa y no constituye promesa de compraventa. ' +
        'Valores sujetos a cambio sin previo aviso.',
    );
  }
}
