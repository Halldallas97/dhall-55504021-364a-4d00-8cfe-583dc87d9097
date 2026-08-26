import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { IsAuthenticated } from '../auth/is-authenticated';
import { Button } from '../components/button';

@Component({
  imports: [Button, IsAuthenticated, RouterLink],
  selector: 'app-header',
  template: `
    <header
      class="h-20 w-full border-b border-white/10 bg-gradient-to-b from-[#0f172a] to-[#020617]"
    >
      <div class="relative flex h-full items-center justify-center px-4 sm:px-6">
        <a
          [routerLink]="auth.isAuthenticated() ? '/welcome' : '/'"
          aria-label="Task Management"
          class="text-center"
        >
          <h1
            class="text-base font-extrabold leading-tight tracking-wide text-white sm:text-2xl md:text-3xl"
          >
            TurboVets<span class="ml-1 text-red-500">Assessment</span>
          </h1>
        </a>

        <app-is-authenticated>
          <div class="absolute right-4 top-1/2 -translate-y-1/2 sm:right-6">
            <app-button type="button" (click)="logout()">Logout</app-button>
          </div>
        </app-is-authenticated>

        <div class="absolute inset-x-0 bottom-0 flex items-center justify-center">
          <div class="h-px w-full bg-white/10"></div>
          <div class="absolute flex items-center justify-center">
          </div>
        </div>
      </div>
    </header>
  `,
})
export class Header {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
