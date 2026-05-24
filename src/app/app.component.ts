import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="titlebar"></div>
    <div class="content"><router-outlet /></div>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {}
