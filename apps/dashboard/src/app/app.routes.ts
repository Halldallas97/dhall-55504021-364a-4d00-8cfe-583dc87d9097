import { Route } from '@angular/router';
import { LoginPage } from './pages/login/login';
import { WelcomePage } from './pages/welcome/welcome';

export const appRoutes: Route[] = [
  { path: '', component: LoginPage },
  { path: 'welcome', component: WelcomePage },
  { path: '**', redirectTo: '' },
];
