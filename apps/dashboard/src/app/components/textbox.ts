import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-textbox',
  host: { class: 'block' },
  template: `
    <div class="w-full">
      @if (label) {
        <label
          [for]="inputId"
          [class]="
            'mb-1 block text-sm font-medium text-gray-700 ' + labelClassName
          "
        >
          {{ label }}
          @if (required) {
            <span class="text-red-500">*</span>
          }
        </label>
      }

      <input
        [type]="type"
        [id]="inputId"
        [name]="name"
        [required]="required"
        [placeholder]="placeholder"
        [value]="value"
        [attr.autocomplete]="autocomplete"
        (input)="handleInput($event)"
        [class]="
          'w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
          inputClassName
        "
      />
    </div>
  `,
})
export class Textbox {
  @Input() label?: string;
  @Input() name?: string;
  @Input() required = false;
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() value = '';
  @Input() autocomplete?: string;
  @Input() inputClassName = '';
  @Input() labelClassName = '';
  @Output() readonly valueChange = new EventEmitter<string>();

  protected get inputId(): string | undefined {
    return this.name ?? this.label?.toLowerCase().replace(/\s+/g, '-');
  }

  protected handleInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
