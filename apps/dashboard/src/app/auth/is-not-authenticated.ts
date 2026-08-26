import { Component, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-is-not-authenticated',
  template: `
    @if (!auth.isAuthenticated()) {
      <ng-content />
    }
  `,
})
export class IsNotAuthenticated {
  protected readonly auth = inject(AuthService);
}
