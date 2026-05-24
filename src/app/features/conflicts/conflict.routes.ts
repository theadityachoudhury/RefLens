import { Routes } from '@angular/router';

export const conflictRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./conflict-list.component').then((m) => m.ConflictListComponent),
  },
  {
    path: 'resolve/:fileIndex',
    loadComponent: () =>
      import('./conflict-viewer.component').then((m) => m.ConflictViewerComponent),
  },
  {
    path: 'preview/:fileIndex/:option',
    loadComponent: () =>
      import('./resolution-preview.component').then((m) => m.ResolutionPreviewComponent),
  },
];
