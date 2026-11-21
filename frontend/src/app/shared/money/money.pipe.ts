import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

/** 12.5 | money: 'tnd' → « 12,500 TND » (3 décimales pour le dinar, 2 sinon). */
@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency = environment.currency): string {
    if (value === null || value === undefined) return '';
    const c = currency.toUpperCase();
    const digits = ['TND', 'BHD', 'JOD', 'KWD', 'OMR'].includes(c) ? 3 : 2;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: c,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }
}
