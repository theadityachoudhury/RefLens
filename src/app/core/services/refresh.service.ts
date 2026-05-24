import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RefreshService {
  readonly refresh$ = new Subject<void>();

  trigger(): void {
    this.refresh$.next();
  }
}
