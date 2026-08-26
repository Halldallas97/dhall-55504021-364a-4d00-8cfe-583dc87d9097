import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  CreateUser,
  LoginDto,
  LoginResponse,
  User,
} from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly userApiUrl = '/api/user';

  loginUser(credentials: LoginDto): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.userApiUrl}/login`,
      credentials,
    );
  }

  createUser(user: CreateUser): Observable<User> {
    return this.http.post<User>(`${this.userApiUrl}/create`, user);
  }
}
