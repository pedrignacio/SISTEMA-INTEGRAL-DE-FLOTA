import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonList,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonItemDivider,
} from '@ionic/angular/standalone';
import { Router, NavigationEnd } from '@angular/router';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  gridOutline,
  newspaperOutline,
  buildOutline,
  flameOutline,
  carOutline,
  peopleOutline,
  navigateOutline,
  warningOutline,
  mapOutline,
  businessOutline,
  clipboardOutline,
  person,
  personCircleOutline,
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonList,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonItemDivider,
  ],
})
export class SidebarComponent implements OnInit {
  public selectedIndex = 0; // Índice del elemento seleccionado
  public appPages = [
    { title: 'Dashboard', url: '/dashboard', icon: 'grid' },
    { 
      title: 'Reportes', 
      url: '/reporte-mantenimiento', 
      icon: 'newspaper',
      roles: ['gestor', 'admin', 'mantenimiento'] // Especificamos que este elemento es para estos roles
    },
    { title: 'Mantenimientos', url: '/planificacion-list', icon: 'build' },
    { title: 'Vehículos', url: '/vehiculos', icon: 'car' },
    {
      title: 'Asignación de recorridos',
      url: '/asignacion-list',
      icon: 'navigate',
    },
    {
      title: 'Órdenes de Trabajo',
      url: '/orden-trabajo-list',
      icon: 'clipboard',
    },
    { title: 'Gestión de Rutas', url: '/rutas', icon: 'map' },
    { title: 'Recorridos', url: '/recorridos', icon: 'navigate' },
    {
      title: 'Gestión de Incidentes',
      url: '/gestion-siniestros',
      icon: 'warning',
    },
  ];
  public adminPages = [
    {
      title: 'Gestión de Usuarios',
      url: '/gestion-usuarios',
      icon: 'person-circle',
    },
  ];

  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    addIcons({
      gridOutline,
      newspaperOutline,
      buildOutline,
      flameOutline,
      carOutline,
      peopleOutline,
      navigateOutline,
      warningOutline,
      mapOutline,
      businessOutline,
      clipboardOutline,
      person,
    });
  }

  ngOnInit() {
    // Actualizar el índice seleccionado basado en la ruta actual
    this.updateSelectedIndex(this.router.url);

    // Escuchar cambios en la navegación para actualizar el índice
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateSelectedIndex(event.urlAfterRedirects);
      }
    });
  }

  private updateSelectedIndex(url: string) {
    const index = this.appPages.findIndex((page) => url.startsWith(page.url));
    this.selectedIndex = index !== -1 ? index : 0; // Si no se encuentra, marcar Dashboard
  }

  esRol(
    rol: 'admin' | 'gestor' | 'conductor' | 'mantenimiento' | 'tecnico'
  ): boolean {
    const usuario = this.authService.getCurrentUser();
    return usuario ? usuario.rol === rol : false;
  }

  puedeAcceder(roles: string[]): boolean {
    const usuario = this.authService.getCurrentUser();
    if (!usuario) return false;
    return roles.includes(usuario.rol);
  }
}
