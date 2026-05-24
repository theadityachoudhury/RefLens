import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { RepositoryService } from '../services/repository.service';

export const repoOpenGuard = () => {
  const repo = inject(RepositoryService);
  const router = inject(Router);
  if (repo.activeRepo) return true;
  return router.createUrlTree(['/']);
};
