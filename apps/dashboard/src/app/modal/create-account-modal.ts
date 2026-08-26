import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Button } from '../components/button';
import { Textbox } from '../components/textbox';
import { UserService } from '../userservice/user.service';

@Component({
  imports: [Button, Textbox],
  selector: 'app-create-account-modal',
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-account-title"
      >
        <div
          class="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-slate-900 p-8 shadow-2xl"
        >
          @if (accountCreated()) {
            <div class="text-center">
              <h3
                id="create-account-title"
                class="text-2xl font-bold text-green-400"
              >
                Account Created
              </h3>
              <p class="mt-4 text-slate-300">
                Your account is ready. You can now log in.
              </p>
              <app-button
                type="button"
                className="mt-6 w-full bg-cyan-600 text-white hover:bg-cyan-700"
                (click)="close()"
              >
                Continue to login
              </app-button>
            </div>
          } @else {
            <form class="space-y-4" novalidate (submit)="onSubmit($event)">
              <h3
                id="create-account-title"
                class="text-center text-2xl font-bold text-cyan-400"
              >
                Create Account
              </h3>

              <app-textbox
                label="Name"
                name="name"
                autocomplete="name"
                placeholder="Enter your name"
                inputClassName="bg-slate-800 text-white placeholder:text-white border-slate-600"
                labelClassName="text-white"
                [required]="true"
                [(value)]="name"
              />

              <app-textbox
                label="Email"
                name="email"
                type="email"
                autocomplete="email"
                placeholder="Enter your email"
                inputClassName="bg-slate-800 text-white placeholder:text-white border-slate-600"
                labelClassName="text-white"
                [required]="true"
                [(value)]="email"
              />

              <app-textbox
                label="Password"
                name="password"
                type="password"
                autocomplete="new-password"
                placeholder="Create a password"
                inputClassName="bg-slate-800 text-white placeholder:text-white border-slate-600"
                labelClassName="text-white"
                [required]="true"
                [(value)]="password"
              />

              <app-textbox
                label="Organization name (optional)"
                name="organizationName"
                autocomplete="organization"
                placeholder="Enter your organization"
                inputClassName="bg-slate-800 text-white placeholder:text-white border-slate-600"
                labelClassName="text-white"
                [(value)]="organizationName"
              />

              @if (statusMessage()) {
                <p
                  class="text-center text-sm text-red-400"
                  role="status"
                  aria-live="polite"
                >
                  {{ statusMessage() }}
                </p>
              }

              <app-button
                type="submit"
                className="w-full bg-cyan-600 text-white hover:bg-cyan-700"
                [disabled]="isSubmitting()"
              >
                {{ isSubmitting() ? 'Creating...' : 'Create account' }}
              </app-button>

              <button
                type="button"
                class="w-full text-center text-sm text-cyan-400 hover:underline"
                (click)="close()"
              >
                Back to login
              </button>
            </form>
          }
        </div>
      </div>
    }
  `,
})
export class CreateAccountModal {
  private readonly userService = inject(UserService);

  @Input() isOpen = false;
  @Output() readonly closed = new EventEmitter<void>();

  protected name = '';
  protected email = '';
  protected password = '';
  protected organizationName = '';
  protected readonly statusMessage = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly accountCreated = signal(false);

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.statusMessage.set('');

    if (!this.name.trim()) {
      this.statusMessage.set('Please enter your name.');
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.statusMessage.set('Please enter a valid email.');
      return;
    }

    if (!this.password) {
      this.statusMessage.set('Please enter a password.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      await firstValueFrom(
        this.userService.createUser({
          name: this.name.trim(),
          email: this.email.trim(),
          password: this.password,
          organizationName: this.organizationName.trim() || undefined,
        }),
      );

      this.accountCreated.set(true);
    } catch (error: unknown) {
      this.statusMessage.set(this.getErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected close(): void {
    this.reset();
    this.closed.emit();
  }

  private reset(): void {
    this.name = '';
    this.email = '';
    this.password = '';
    this.organizationName = '';
    this.statusMessage.set('');
    this.isSubmitting.set(false);
    this.accountCreated.set(false);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const response = error.error as { message?: unknown } | null;
      if (typeof response?.message === 'string') {
        return response.message;
      }
    }

    return 'Unable to create your account. Please try again.';
  }
}
