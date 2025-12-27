import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  public appPages = [
    { title: 'Wizard de Simulação', url: '/wizard', icon: 'sparkles' },
    { title: 'Simulação de Plano', url: '/simulacao', icon: 'calculator' },
    { title: 'Inbox', url: '/folder/inbox', icon: 'mail' },
    { title: 'Outbox', url: '/folder/outbox', icon: 'paper-plane' },
    { title: 'Favorites', url: '/folder/favorites', icon: 'heart' },
    { title: 'Archived', url: '/folder/archived', icon: 'archive' },
    { title: 'Trash', url: '/folder/trash', icon: 'trash' },
    { title: 'Spam', url: '/folder/spam', icon: 'warning' },
  ];
  public labels = ['Family', 'Friends', 'Notes', 'Work', 'Travel', 'Reminders'];
  
  constructor(
    private menuController: MenuController,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Monitora mudanças de rota para habilitar/desabilitar o menu
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url;
        const deveOcultarMenu =
          url === '/login' ||
          url.startsWith('/login') ||
          url === '/wizard' ||
          url.startsWith('/wizard') ||
          url === '/formulario-orcamento' ||
          url.startsWith('/formulario-orcamento') ||
          url === '/resultado-orcamento' ||
          url.startsWith('/resultado-orcamento');

        this.menuController.enable(!deveOcultarMenu);
      });
  }

  logout() {
    this.authService.logout();
  }
}
