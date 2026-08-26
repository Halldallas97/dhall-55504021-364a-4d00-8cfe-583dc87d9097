import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { Button } from '../../components/button';
import { Textbox } from '../../components/textbox';
import { CreateAccountModal } from '../../modal/create-account-modal';
import { StatusModal } from '../../modal/status-modal';
import { UserService } from '../../userservice/user.service';

@Component({
  imports: [Button, CreateAccountModal, StatusModal, Textbox],
  templateUrl: './login.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  protected email = '';
  protected password = '';
  protected readonly statusMessage = signal('');
  protected readonly loginErrorMessage = signal('');
  protected readonly isCreateAccountOpen = signal(false);
  protected readonly isSubmitting = signal(false);

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.statusMessage.set('');
    this.loginErrorMessage.set('');

    if (!this.isValidEmail(this.email)) {
      this.statusMessage.set('Please enter a valid email.');
      return;
    }

    if (!this.password) {
      this.statusMessage.set('Please enter your password.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const { accessToken, user } = await firstValueFrom(
        this.userService.loginUser({
          email: this.email.trim(),
          password: this.password,
        }),
      );

      this.auth.login(user, accessToken);
      await this.router.navigateByUrl('/welcome');
    } catch (error: unknown) {
      this.loginErrorMessage.set(
        error instanceof HttpErrorResponse && error.status === 401
          ? 'Invalid email or password.'
          : 'Unable to log in. Please try again.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected closeLoginError(): void {
    this.loginErrorMessage.set('');
  }

  protected openCreateAccount(): void {
    this.isCreateAccountOpen.set(true);
  }

  protected closeCreateAccount(): void {
    this.isCreateAccountOpen.set(false);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }
}
