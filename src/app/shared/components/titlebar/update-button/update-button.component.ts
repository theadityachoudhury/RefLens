import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ElectronApiService } from '../../../../core/services/electron-api.service';
import type { UpdateEvent } from '../../../../../../shared/ipc-api.types';

type UpdateState = UpdateEvent['type'] | 'idle';

@Component({
  selector: 'rl-update-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './update-button.component.html',
  styleUrl: './update-button.component.scss',
})
export class UpdateButtonComponent implements OnInit, OnDestroy {
  private readonly api = inject(ElectronApiService);
  private sub?: Subscription;

  protected readonly state = signal<UpdateState>('idle');
  protected readonly percent = signal(0);

  ngOnInit(): void {
    this.sub = this.api.onUpdateEvent().subscribe((event) => {
      this.state.set(event.type);
      if (event.type === 'downloading') this.percent.set(Math.round(event.percent));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  download(): void {
    this.api.downloadUpdate().subscribe();
  }

  install(): void {
    this.api.installUpdate().subscribe();
  }
}
