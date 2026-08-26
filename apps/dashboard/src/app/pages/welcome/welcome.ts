import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { IsAuthenticated } from '../../auth/is-authenticated';
import { IsNotAuthenticated } from '../../auth/is-not-authenticated';

@Component({
  imports: [IsAuthenticated, IsNotAuthenticated, RouterLink],
  template: `
    <main
      class="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-white px-4"
    >
      <app-is-authenticated>
        <div class="text-center">
          <h1 class="text-3xl font-semibold text-gray-900">Hi user</h1>
          <p class="mt-2 text-gray-700">
            User type: {{ auth.user()?.role }}
          </p>
        </div>
      </app-is-authenticated>

      <app-is-not-authenticated>
        <div class="text-center">
          <p class="text-gray-700">You need to log in to view this page.</p>
          <a
            routerLink="/"
            class="mt-4 inline-block text-cyan-700 hover:underline"
          >
            Go to login
          </a>
        </div>
      </app-is-not-authenticated>
    </main>
  `,
})
export class WelcomePage {
  protected readonly auth = inject(AuthService);
}
