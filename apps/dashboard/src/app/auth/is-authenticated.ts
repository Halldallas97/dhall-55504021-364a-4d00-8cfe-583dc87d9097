import { Component, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-is-authenticated',
  template: `
    @if (auth.isAuthenticated()) {
      <ng-content />
    }
  `,
})
export class IsAuthenticated {
  protected readonly auth = inject(AuthService);
}
