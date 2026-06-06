import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'rl-nav-buttons',
  standalone: true,
  templateUrl: './nav-buttons.component.html',
  styleUrl: './nav-buttons.component.scss',
})
export class NavButtonsComponent implements OnInit, OnDestroy {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly canGoBack = signal(false);
  readonly canGoForward = signal(false);

  private history: string[] = [];
  private historyIndex = -1;
  private navigatingHistory = false;
  private sub!: Subscription;

  ngOnInit(): void {
    this.history = [this.router.url];
    this.historyIndex = 0;

    this.sub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    ).subscribe((e) => {
      if (this.navigatingHistory) {
        this.navigatingHistory = false;
        return;
      }
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(e.urlAfterRedirects);
      this.historyIndex = this.history.length - 1;
      this.sync();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  back(): void {
    if (!this.canGoBack()) return;
    this.historyIndex--;
    this.navigatingHistory = true;
    this.sync();
    this.location.back();
  }

  forward(): void {
    if (!this.canGoForward()) return;
    this.historyIndex++;
    this.navigatingHistory = true;
    this.sync();
    this.location.forward();
  }

  private sync(): void {
    this.canGoBack.set(this.historyIndex > 0);
    this.canGoForward.set(this.historyIndex < this.history.length - 1);
  }
}
