import { computed, Injectable, signal } from '@angular/core';
import { User } from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storedAuth = this.readStoredAuth();
  private readonly userState = signal<User | null>(this.storedAuth.user);
  private readonly tokenState = signal<string | null>(this.storedAuth.token);

  readonly user = this.userState.asReadonly();
  readonly token = this.tokenState.asReadonly();
  readonly isAuthenticated = computed(
    () => !!this.userState() && !!this.tokenState(),
  );

  login(user: User, token: string): void {
    this.userState.set(user);
    this.tokenState.set(token);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  logout(): void {
    this.userState.set(null);
    this.tokenState.set(null);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  private readStoredAuth(): { user: User | null; token: string | null } {
    const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
    const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);

    if (!storedUser || !storedToken) {
      return { user: null, token: null };
    }

    try {
      return {
        user: JSON.parse(storedUser) as User,
        token: storedToken,
      };
    } catch {
      sessionStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return { user: null, token: null };
    }
  }
}
