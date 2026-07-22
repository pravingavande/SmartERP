import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './core/components/app-toast/app-toast.component';
import { GlobalLoaderComponent } from './core/components/global-loader/global-loader.component';
import { AppVersionService } from './core/services/app-version.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, GlobalLoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly appVersion = inject(AppVersionService);

  ngOnInit(): void {
    this.appVersion.init();
  }
}
