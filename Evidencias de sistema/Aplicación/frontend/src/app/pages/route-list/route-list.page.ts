import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, UpperCasePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  LoadingController,
  AlertController,
  ToastController,
  RefresherCustomEvent,
  ModalController,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  navigateOutline,
  pencilOutline,
  trashOutline,
  addCircleOutline,
  add,
  playCircleOutline,
  eyeOutline,
  createOutline,
  documentTextOutline,
  locationOutline,
  speedometerOutline,
  gitNetworkOutline,
  timeOutline,
} from 'ionicons/icons';

import { ApiService, Route } from '../../services/api.service';
import { TitleService } from '../../services/title.service';
import { SidebarComponent } from '../../componentes/sidebar/sidebar.component';
import { SocketService } from '../../services/socket.service';
import { RouteFormPage } from '../route-form/route-form.page';
import { AlertaPersonalizadaComponent } from '../../componentes/alerta-personalizada/alerta-personalizada.component';
import { BaseListPageComponent } from '../../components/base-list-page.component';
import {
  BaseListService,
  FilterConfig,
} from '../../services/base-list.service';

@Component({
  selector: 'app-route-list',
  templateUrl: './route-list.page.html',
  styleUrls: ['./route-list.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, UpperCasePipe, DecimalPipe],
})
export class RouteListPage
  extends BaseListPageComponent<Route>
  implements OnInit
{
  // Inyección de dependencias (estilo moderno)
  private apiService = inject(ApiService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private socketService = inject(SocketService);

  constructor() {
    const baseListService = inject(BaseListService<Route>);
    const toastController = inject(ToastController);
    const loadingController = inject(LoadingController);
    const modalController = inject(ModalController);
    const titleService = inject(TitleService);

    super(
      baseListService,
      toastController,
      loadingController,
      modalController,
      titleService
    );

    addIcons({
      navigateOutline,
      pencilOutline,
      trashOutline,
      addCircleOutline,
      add,
      playCircleOutline,
      eyeOutline,
      createOutline,
      documentTextOutline,
      locationOutline,
      speedometerOutline,
      gitNetworkOutline,
      timeOutline,
    }); // Registra todos los usados en el HTML de esta página
  }
  override async ngOnInit() {
    await super.ngOnInit();
  }

  override ionViewWillEnter() {
    super.ionViewWillEnter();
  }

  // Implementación de métodos abstractos
  getPageTitle(): string {
    return 'Gestión de Rutas';
  }

  getFilterConfig(): FilterConfig<Route> {
    return {
      searchFields: ['nombreRuta'],
      customFilters: {},
    };
  }

  async loadData(): Promise<Route[]> {
    return new Promise((resolve, reject) => {
      this.apiService.getRoutes().subscribe({
        next: (data) => resolve(data),
        error: (error) => reject(error),
      });
    });
  }

  // Getter para compatibilidad con el template
  get paginatedRoutes(): Route[] {
    return this.paginatedItems;
  } // --- Manejo del Refresher ---
  handleRefresh(event: RefresherCustomEvent) {
    this.loadItems(event);
  }

  async loadRoutes(event?: RefresherCustomEvent) {
    await this.loadItems(event);
  }
  // --- Navegación ---
  async goToAddRoute() {
    console.log('Abriendo modal para crear nueva ruta');

    const modal = await this.modalCtrl.create({
      component: RouteFormPage,
      backdropDismiss: false,
      showBackdrop: true,
      cssClass: 'routes-form-modal',
    });

    modal.onDidDismiss().then((result: any) => {
      if (result.data?.routeCreated) {
        console.log('Ruta creada exitosamente, recargando lista');
        this.loadItems();
        this.presentToast('Ruta creada exitosamente', 'success');
      }
    });

    return await modal.present();
  } // Este método se llama desde el ion-item-option del lápiz
  async editRoute(id: number) {
    console.log('Abriendo modal para editar ruta ID:', id);

    const modal = await this.modalCtrl.create({
      component: RouteFormPage,
      backdropDismiss: false,
      showBackdrop: true,
      cssClass: 'routes-form-modal',
      componentProps: {
        routeId: id,
        isEditMode: true,
      },
    });

    modal.onDidDismiss().then((result) => {
      if (result.data && result.data.routeCreated) {
        console.log('Ruta editada exitosamente');
        this.loadItems(); // Recargar la lista
      }
    });

    return await modal.present();
  }
  startRouteSimulation(routeId: number, routeName: string) {
    console.log(
      `Solicitando iniciar simulación para Ruta ID: ${routeId}, Nombre: "${routeName}"`
    );

    // Definir el ID del vehículo a simular
    const vehicleIdToUse = 1;

    // Emitir el evento 'startSimulation' al backend
    this.socketService.emit('startSimulation', {
      routeId: routeId,
      vehicleId: vehicleIdToUse,
    });

    // Mensaje al usuario
    this.presentToast(
      `Iniciando simulación para "${routeName}" con vehículo ${vehicleIdToUse}. Ve al mapa.`,
      'success'
    );

    // Navegar automáticamente a la página del mapa
    this.router.navigateByUrl('/recorridos');
  }
  // --- Fin del método a añadir ---  // El método viewRouteDetail ahora también usa modal para consistencia
  async viewRouteDetail(id: number) {
    console.log('Abriendo modal para ver detalle ruta:', id);

    const modal = await this.modalCtrl.create({
      component: RouteFormPage,
      backdropDismiss: false,
      showBackdrop: true,
      cssClass: 'routes-form-modal',
      componentProps: {
        routeId: id,
        isEditMode: false,
        isViewMode: true,
      },
    });

    modal.onDidDismiss().then((result: any) => {
      if (result.data && result.data.routeCreated) {
        console.log('Ruta actualizada exitosamente');
        this.loadItems(); // Recargar la lista
      }
    });

    return await modal.present();
  }
  // --- Eliminación ---
  async confirmDeleteRoute(id: number, name: string) {
    const modal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: 'Confirmar Eliminación',
        message: `¿Estás seguro de que quieres eliminar la ruta "<strong>${name}</strong>"? Esta acción no se puede deshacer.`,
        icon: 'warning',
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'button-cancel' },
          { text: 'Eliminar', role: 'confirm', cssClass: 'button-danger' },
        ],
      },
      backdropDismiss: false,
      cssClass: 'custom-alert-modal',
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data === 'confirm') {
      this.deleteRoute(id);
    }
  }
  private async deleteRoute(id: number) {
    const loading = await this.loadingCtrl.create({
      message: 'Eliminando...',
    });
    await loading.present();

    this.apiService.deleteRoute(id).subscribe({
      next: async (res) => {
        console.log('Ruta eliminada:', res.message);
        await loading.dismiss();
        this.presentToast('Ruta eliminada exitosamente.', 'success');
        this.loadItems();
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('Error al eliminar ruta:', error);

        const modal = await this.modalCtrl.create({
          component: AlertaPersonalizadaComponent,
          componentProps: {
            title: 'Error al Eliminar',
            message: 'No se pudo eliminar la ruta. ' + error.message,
            icon: 'error',
            buttons: [{ text: 'Aceptar', role: 'confirm' }],
          },
          cssClass: 'custom-alert-modal',
        });
        await modal.present();
      },
    });
  }
  async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger' | 'medium' = 'medium'
  ) {
    await this.mostrarToast(message, color);
  }
  async showErrorAlert(title: string, message: string) {
    const modal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title,
        message,
        icon: 'error',
        buttons: [{ text: 'Aceptar', role: 'confirm' }],
      },
      cssClass: 'custom-alert-modal',
    });
    await modal.present();
  }

  // Método para formatear la duración en formato HH:MM
  formatDurationAsTime(durationMinutes: number | null | undefined): string {
    if (!durationMinutes) return 'No calculada';

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    // Formatear con ceros a la izquierda si es necesario
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');

    return `${hoursStr}:${minutesStr}`;
  }
}
