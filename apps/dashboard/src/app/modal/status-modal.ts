import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Button } from '../components/button';

export type StatusModalVariant = 'error' | 'info' | 'success';

@Component({
  imports: [Button],
  selector: 'app-status-modal',
  template: `
    @if (isOpen && message) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
      >
        <div
          class="w-full max-w-md rounded-xl bg-slate-900 p-8 text-center shadow-2xl"
        >
          <h3
            id="status-modal-title"
            [class]="'text-2xl font-bold ' + variantClass"
          >
            {{ title }}
          </h3>

          <p class="mt-4 text-slate-300">{{ message }}</p>

          <app-button
            type="button"
            className="mt-6 w-full bg-cyan-600 text-white hover:bg-cyan-700"
            (click)="closed.emit()"
          >
            Try Again
          </app-button>
        </div>
      </div>
    }
  `,
})
export class StatusModal {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() message = '';
  @Input() variant: StatusModalVariant = 'error';
  @Output() readonly closed = new EventEmitter<void>();

  protected get variantClass(): string {
    const variantStyles: Record<StatusModalVariant, string> = {
      error: 'text-red-400',
      info: 'text-cyan-400',
      success: 'text-green-400',
    };

    return variantStyles[this.variant];
  }
}
