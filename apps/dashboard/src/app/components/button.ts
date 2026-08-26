import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-button',
  host: { class: 'block' },
  template: `
    <button [type]="type" [disabled]="disabled" [class]="buttonClasses">
      <ng-content />
    </button>
  `,
})
export class Button {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() className = '';

  protected get buttonClasses(): string {
    return `
      px-4 py-2
      bg-gray-800
      text-[#c85048]
      hover:bg-gray-700
      hover:text-white
      focus:outline-none
      focus:ring-2
      focus:ring-gray-600
      rounded
      disabled:opacity-40
      disabled:cursor-not-allowed
      ${this.className}
    `;
  }
}
