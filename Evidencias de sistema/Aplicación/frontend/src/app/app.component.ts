// src/app/app.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { TitleService } from './services/title.service';
import { Observable, combineLatest, startWith } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common'; // Necesario para directivas como *ngIf si es standalone
import { Router, NavigationEnd } from '@angular/router';

// Módulos de Ionic necesarios para el template de app.component.html
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonRouterOutlet,
} from '@ionic/angular/standalone';
import { HeaderComponent } from './componentes/header/header.component'; // Importa tu HeaderComponent
import { SidebarComponent } from './componentes/sidebar/sidebar.component'; // Importa tu SidebarComponent

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true, // Asumiendo que tu app.component es standalone
  imports: [
    CommonModule,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonRouterOutlet,
    HeaderComponent,
    SidebarComponent,
  ],
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private titleService = inject(TitleService);
  private router = inject(Router);

  shouldShowSidebar$: Observable<boolean> | undefined;
  shouldShowHeader$: Observable<boolean> | undefined;
  currentUrl$: Observable<string> | undefined;
  currentTitle$: Observable<string> | undefined;

  constructor() {}

  ngOnInit() {
    // Observable para detectar cambios de ruta
    this.currentUrl$ = this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => (event as NavigationEnd).url),
      startWith(this.router.url) // Incluir la URL inicial
    );

    // Observable para el título dinámico
    this.currentTitle$ = this.titleService.title$;

    // Configurar títulos basados en la ruta
    this.currentUrl$.subscribe((url) => {
      this.setTitleForRoute(url);
    });

    // Observable para mostrar/ocultar sidebar
    this.shouldShowSidebar$ = combineLatest([
      this.authService.currentUser$,
      this.currentUrl$,
    ]).pipe(
      map(([user, url]) => {
        // Ocultar sidebar si no hay usuario autenticado, si es técnico/conductor, o si está en login/register
        const isAuthPage = url === '/login' || url === '/register';
        const shouldHideForRole =
          user && (user.rol === 'tecnico' || user.rol === 'conductor');

        return !isAuthPage && !!user && !shouldHideForRole;
      })
    );

    // Observable para mostrar/ocultar header
    this.shouldShowHeader$ = this.currentUrl$.pipe(
      map((url) => {
        // Ocultar header solo en páginas de login y register
        return url !== '/login' && url !== '/register';
      })
    );
  }

  public setTitleForRoute(url: string) {
    const routeTitles: { [key: string]: string } = {
      '/dashboard': 'Dashboard - Gestión de Flota',
      '/vehiculos': 'Gestión de Vehículos',
      '/asignacion-list': 'Gestión de Asignaciones',
      '/rutas': 'Gestión de Rutas',
      '/planificacion-list': 'Planificación de Mantenimiento',
      '/orden-trabajo-list': 'Órdenes de Trabajo',
      '/gestion-usuarios': 'Gestión de Usuarios',
      '/gestion-siniestros': 'Gestión de Incidentes',
      '/recorridos': 'Mapa y Recorridos',
      '/historial-vehiculo/:id': 'Historial de Vehículo',
      '/siniestro-detalle': 'Detalle de Incidente',
      '/login': 'Iniciar Sesión',
      '/register': 'Registrarse',
      '/reporte-mantenimiento': 'Reportes y Estadísticas',
    };

    const title = routeTitles[url] || 'SIF - Sistema Integral de Flota';
    this.titleService.setTitle(title);
  }
}
