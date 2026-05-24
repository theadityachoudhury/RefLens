import { Routes } from '@angular/router';
import { repoOpenGuard } from './core/guards/repo-open.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/welcome/welcome.component').then(
        (m) => m.WelcomeComponent,
      ),
  },
  {
    path: 'graph',
    canActivate: [repoOpenGuard],
    loadComponent: () =>
      import('./features/graph/graph.component').then((m) => m.GraphComponent),
  },
  {
    path: 'conflicts',
    canActivate: [repoOpenGuard],
    loadChildren: () =>
      import('./features/conflicts/conflict.routes').then(
        (m) => m.conflictRoutes,
      ),
  },
  {
    path: 'rebase',
    canActivate: [repoOpenGuard],
    loadComponent: () =>
      import('./features/rebase/rebase.component').then(
        (m) => m.RebaseComponent,
      ),
  },
  {
    path: 'cherry-pick',
    canActivate: [repoOpenGuard],
    loadComponent: () =>
      import('./features/cherry-pick/cherry-pick.component').then(
        (m) => m.CherryPickComponent,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
