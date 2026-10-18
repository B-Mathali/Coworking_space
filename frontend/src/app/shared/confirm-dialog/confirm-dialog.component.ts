import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../../core/services/confirm.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (confirm.pending(); as p) {
      <div class="modal-backdrop" (click)="confirm.answer(false)">
        <div class="modal modal-sm" role="alertdialog" aria-modal="true" [attr.aria-label]="p.title" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div class="modal-icon" [class.danger]="p.danger">
              <app-icon [name]="p.danger ? 'alert' : 'info'" [size]="22" />
            </div>
            <div>
              <h2>{{ p.title }}</h2>
              @if (p.message) { <p>{{ p.message }}</p> }
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-outline" (click)="confirm.answer(false)">{{ p.cancelText ?? 'Annuler' }}</button>
            <button class="btn" [class.btn-danger]="p.danger" [class.btn-primary]="!p.danger" (click)="confirm.answer(true)" autofocus>
              {{ p.confirmText ?? 'Confirmer' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly confirm = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  onEscape() {
    this.confirm.answer(false);
  }
}
