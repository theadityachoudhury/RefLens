import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'rl-error',
  standalone: true,
  templateUrl: './error.component.html',
  styleUrl: './error.component.scss',
})
export class ErrorComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  protected readonly title: string;
  protected readonly message: string;

  constructor() {
    const state = this.router.getCurrentNavigation()?.extras.state ?? history.state;
    this.title = state?.['title'] ?? 'Something went wrong';
    this.message = state?.['message'] ?? 'An unexpected error occurred.';
  }

  back(): void {
    this.location.back();
  }
}
