import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';

interface Company {
  name: string;
  address: string;
  email: string;
  taxId: string;
}

const COLORS = { primary: '#5b4cf5', text: '#1f2333', muted: '#6b7085', line: '#e3e5ee', soft: '#f4f3ff' };

/** Génère la facture PDF d'une réservation payée (pdfkit, polices standard : aucun fichier à embarquer). */
@Injectable()
export class InvoiceService {
  constructor(private readonly config: ConfigService) {}

  generate(reservation: Reservation, payment: Payment): Promise<Buffer> {
    const company = this.config.get<Company>('billing.company')!;
    const tz = this.config.get<string>('billing.timezone') ?? 'UTC';
    const money = (n: number) => formatMoney(n, payment.currency);
    const date = (d: Date, withTime = false) =>
      clean(
        new Intl.DateTimeFormat('fr-FR', {
          timeZone: tz,
          dateStyle: 'long',
          ...(withTime ? { timeStyle: 'short' } : {}),
        }).format(new Date(d)),
      );
    const time = (d: Date) =>
      new Intl.DateTimeFormat('fr-FR', { timeZone: tz, timeStyle: 'short' }).format(new Date(d));

    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Facture ${payment.invoiceNumber}` } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const left = 50;
    const right = doc.page.width - 50;
    const width = right - left;

    // ---- En-tête : émetteur + numéro ----
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(22).text(company.name, left, 50);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(company.address).text(company.email);
    if (company.taxId) doc.text(`Matricule fiscal : ${company.taxId}`);

    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(20).text('FACTURE', left, 50, { width, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted);
    doc.text(`N° ${payment.invoiceNumber}`, { width, align: 'right' });
    doc.text(`Date : ${date(payment.paidAt ?? payment.createdAt)}`, { width, align: 'right' });

    // ---- Client ----
    let y = 145;
    doc.roundedRect(left, y, width / 2 - 10, 62, 6).fill(COLORS.soft);
    doc.fillColor(COLORS.muted).fontSize(8).font('Helvetica-Bold').text('FACTURÉ À', left + 12, y + 10);
    doc.fillColor(COLORS.text).fontSize(11).text(reservation.user?.fullName ?? '', left + 12, y + 24);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(reservation.user?.email ?? '', left + 12, y + 40);

    // ---- Tableau des prestations ----
    y = 240;
    const cols = [
      { label: 'Description', x: left, w: 245, align: 'left' as const },
      { label: 'Qté (h)', x: left + 245, w: 60, align: 'right' as const },
      { label: 'Prix unit. HT', x: left + 305, w: 95, align: 'right' as const },
      { label: 'Total HT', x: left + 400, w: width - 400, align: 'right' as const },
    ];
    doc.rect(left, y, width, 24).fill(COLORS.primary);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
    for (const c of cols) doc.text(c.label, c.x + 8, y + 8, { width: c.w - 16, align: c.align });

    y += 34;
    const space = reservation.seat?.space?.name ?? 'Espace';
    const seat = reservation.seat?.label ?? '';
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10);
    doc.text(`Réservation — ${space}`, cols[0].x + 8, y, { width: cols[0].w - 16 });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
    doc.text(
      `Place ${seat} · ${date(reservation.startTime)}, ${time(reservation.startTime)} – ${time(reservation.endTime)}`,
      { width: cols[0].w - 16 },
    );
    const rowBottom = doc.y;
    doc.fillColor(COLORS.text).fontSize(10);
    doc.text(fmtNumber(payment.hours), cols[1].x + 8, y, { width: cols[1].w - 16, align: 'right' });
    doc.text(money(payment.unitPrice), cols[2].x + 8, y, { width: cols[2].w - 16, align: 'right' });
    doc.text(money(payment.amountHT), cols[3].x + 8, y, { width: cols[3].w - 16, align: 'right' });

    y = rowBottom + 12;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(COLORS.line).lineWidth(1).stroke();

    // ---- Totaux ----
    y += 16;
    const totalsX = left + width / 2;
    const totalsW = width / 2;
    const line = (label: string, value: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10).fillColor(COLORS.text);
      doc.text(label, totalsX + 8, y, { width: totalsW / 2 - 8 });
      doc.text(value, totalsX + totalsW / 2, y, { width: totalsW / 2 - 8, align: 'right' });
      y += bold ? 24 : 18;
    };
    line('Total HT', money(payment.amountHT));
    line(`TVA (${fmtNumber(payment.vatRate * 100)} %)`, money(payment.vatAmount));
    doc.rect(totalsX, y - 8, totalsW, 30).fill(COLORS.soft);
    line('Total TTC', money(payment.amountTTC), true);

    // ---- Paiement ----
    y += 24;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text('Paiement', left, y);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
    const card = payment.cardBrand
      ? `Carte ${capitalize(payment.cardBrand)}${payment.cardLast4 ? ` •••• ${payment.cardLast4}` : ''}`
      : 'Carte bancaire';
    doc.text(`${card} via Stripe — payé le ${date(payment.paidAt ?? payment.createdAt, true)}`, { width: width - 140 });
    if (payment.stripePaymentIntentId) doc.text(`Référence : ${payment.stripePaymentIntentId}`);

    if (payment.status === PaymentStatus.REFUNDED) {
      doc.moveDown(0.8).font('Helvetica-Bold').fillColor('#d43c3c');
      doc.text(
        `Réservation annulée — montant intégralement remboursé${payment.refundedAt ? ` le ${date(payment.refundedAt)}` : ''}.`,
      );
    } else {
      doc.save().rotate(-10, { origin: [right - 60, y + 14] });
      doc.roundedRect(right - 110, y - 2, 100, 32, 4).lineWidth(2).strokeColor('#1f9d55').stroke();
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#1f9d55').text('PAYÉE', right - 110, y + 7, { width: 100, align: 'center' });
      doc.restore();
    }

    // ---- Pied de page ----
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
    doc.text(
      `${company.name} · ${company.address} · ${company.email}\nMerci pour votre confiance.`,
      left,
      doc.page.height - 80,
      { width, align: 'center', lineBreak: true },
    );

    doc.end();
    return done;
  }
}

/** Les polices PDF standard ne connaissent pas les espaces insécables fines utilisées par Intl. */
const clean = (s: string) => s.replace(/[  ]/g, ' ');

const formatMoney = (n: number, currency: string) => {
  const c = currency.toUpperCase();
  return clean(
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: c,
      minimumFractionDigits: c === 'TND' ? 3 : 2,
    }).format(n),
  );
};
const fmtNumber = (n: number) => clean(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n));
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
