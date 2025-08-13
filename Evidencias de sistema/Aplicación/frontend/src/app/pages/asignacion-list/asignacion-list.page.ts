import { Component, OnInit, inject } from '@angular/core';
import {
  CommonModule,
  DatePipe,
  DecimalPipe,
  UpperCasePipe,
} from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  LoadingController,
  AlertController,
  ToastController,
  ModalController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  eyeOutline,
  createOutline,
  trashOutline,
  addCircleOutline,
  playCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  timeOutline,
  carSportOutline,
  personCircleOutline,
  mapOutline,
  analyticsOutline,
  locationOutline,
  calendarOutline,
  optionsOutline,
  add,
} from 'ionicons/icons';

import {
  ApiService,
  AsignacionRecorrido,
  Route,
  Vehiculo,
  UsuarioConductorInfo,
} from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { BaseListPageComponent } from '../../components/base-list-page.component';
import {
  BaseListService,
  FilterConfig,
} from '../../services/base-list.service';
import { TitleService } from '../../services/title.service';
import { AsignacionFormPage } from '../asignacion-form/asignacion-form.page';
import { AlertaPersonalizadaComponent } from '../../componentes/alerta-personalizada/alerta-personalizada.component';

@Component({
  selector: 'app-asignacion-list',
  templateUrl: './asignacion-list.page.html',
  styleUrls: ['./asignacion-list.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    UpperCasePipe,
  ],
})
export class AsignacionListPage
  extends BaseListPageComponent<AsignacionRecorrido>
  implements OnInit
{
  private apiService = inject(ApiService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private socketService = inject(SocketService);

  // Filtros específicos
  private _filterEstado: string = '';

  constructor() {
    const baseListService = inject(BaseListService<AsignacionRecorrido>);
    const toastCtrl = inject(ToastController);
    const loadingCtrl = inject(LoadingController);
    const modalCtrl = inject(ModalController);
    const titleService = inject(TitleService);

    super(baseListService, toastCtrl, loadingCtrl, modalCtrl, titleService);
    addIcons({
      eyeOutline,
      createOutline,
      trashOutline,
      addCircleOutline,
      playCircleOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      timeOutline,
      carSportOutline,
      personCircleOutline,
      mapOutline,
      analyticsOutline,
      locationOutline,
      calendarOutline,
      optionsOutline,
      add,
    });
  }

  override async ngOnInit() {
    await super.ngOnInit();
  }
  override ionViewWillEnter() {
    super.ionViewWillEnter();
    // Forzar la carga inicial de datos
    this.loadItems();
  }

  // Getters/setters para filtros específicos
  get filterEstado(): string {
    return this._filterEstado;
  }

  set filterEstado(value: string) {
    this._filterEstado = value;
    this.setFilter('estado', value);
  }

  // Implementación de métodos abstractos
  getPageTitle(): string {
    return 'Gestión de Asignaciones';
  }
  getFilterConfig(): FilterConfig<AsignacionRecorrido> {
    return {
      searchFields: ['rutaPlantilla', 'vehiculo', 'conductor'] as any,
      customFilters: {
        estado: (item: AsignacionRecorrido, value: string) => {
          // Manejar el caso en que estadoAsig pueda ser undefined o estar en un campo diferente
          const estado = item.estadoAsig || (item as any).estado_asig;
          return !value || estado === value;
        },
      },
    };
  }

  async loadData(): Promise<AsignacionRecorrido[]> {
    return new Promise((resolve, reject) => {
      this.apiService.getAsignacionesRecorrido().subscribe({
        next: (data: AsignacionRecorrido[]) => resolve(data),
        error: (error: any) => reject(error),
      });
    });
  }

  get paginatedAsignaciones() {
    return this.paginatedItems;
  }

  handleRefresh(event: any) {
    this.loadItems(event);
  }
  async loadAsignaciones(event?: any) {
    await this.loadItems(event);
  }

  async goToCreateAsignacion() {
    const modal = await this.modalCtrl.create({
      component: AsignacionFormPage,
      componentProps: { isEditMode: false, isViewMode: false },
      cssClass: 'asignacion-form-modal',
      backdropDismiss: false,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.dataChanged) {
      this.loadItems();
    }
  }

  async viewOrEditAsignacion(idAsig?: number, isViewMode: boolean = false) {
    if (idAsig === undefined) return;

    // Si va a editar, primero verificamos el estado de la asignación
    if (!isViewMode) {
      const asignacion = this.allItems.find(
        (item) => (item.idAsig || (item as any).id_asig) === idAsig
      );

      if (asignacion) {
        const estado = this.getEstado(asignacion);
        if (estado === 'en_progreso' || estado === 'completado') {
          await this.showErrorAlert(
            'Edición no permitida',
            `No se pueden modificar recorridos en estado "${this.getEstadoDisplay(
              estado
            )}".`
          );
          return;
        }
      }
    }

    const modal = await this.modalCtrl.create({
      component: AsignacionFormPage,
      componentProps: {
        asignacionId: idAsig,
        isEditMode: !isViewMode,
        isViewMode: isViewMode,
      },
      cssClass: 'asignacion-form-modal',
      backdropDismiss: false,
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data?.dataChanged) {
      this.loadItems();
    }
  }

  async iniciarSeguimientoEnMapa(asignacion: AsignacionRecorrido) {
    console.log(
      '[Simulación] Objeto de asignación recibido al hacer clic:',
      asignacion
    );

    const asignacionId = asignacion.idAsig || (asignacion as any).id_asig;
    const rutaId = asignacion.rutaPlantilla?.idRuta;
    const vehiculoId = asignacion.vehiculo?.idVehi;

    if (
      asignacionId === undefined ||
      rutaId === undefined ||
      vehiculoId === undefined
    ) {
      console.error('Datos incompletos para iniciar simulación. Faltan IDs.', {
        asignacionId,
        rutaId,
        vehiculoId,
      });
      this.presentToast(
        'Faltan datos de la asignación (ruta o vehículo) para iniciar el seguimiento.',
        'warning'
      );
      return;
    }
    if (
      this.getEstado(asignacion) !== 'en_progreso' &&
      this.getEstado(asignacion) !== 'asignado'
    ) {
      this.presentToast(
        `El seguimiento solo se puede iniciar para asignaciones "En Progreso" o "Asignado".`,
        'warning'
      );
      return;
    }

    this.procederConInicioSimulacion(asignacionId, rutaId, vehiculoId);
  }

  private procederConInicioSimulacion(
    asignacionId: number,
    rutaId: number,
    vehiculoId: number
  ) {
    console.log(
      `[Simulación] Datos correctos. Enviando evento 'startSimulation' con Asignación ID: ${asignacionId}`
    );
    this.socketService.emit('startSimulation', {
      routeId: rutaId,
      vehicleId: vehiculoId,
      asignacionId: asignacionId,
    });
    this.router.navigate(['/recorridos'], {
      queryParams: { asignacionId, vehiculoId, rutaId },
    });
  }

  async confirmDeleteAsignacion(asignacion: AsignacionRecorrido) {
    const asignacionId = asignacion.idAsig || (asignacion as any).id_asig;
    if (asignacionId === undefined) return;

    const modal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: 'Confirmar Eliminación',
        message: `¿Seguro de eliminar la asignación para la ruta "<strong>${
          asignacion.rutaPlantilla?.nombreRuta || 'Desconocida'
        }</strong>"?`,
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
      this.deleteAsignacion(asignacionId);
    }
  }
  async deleteAsignacion(idAsig: number) {
    const loading = await this.loadingCtrl.create({
      message: 'Eliminando asignación...',
    });
    await loading.present();
    this.apiService.deleteAsignacionRecorrido(idAsig).subscribe({
      next: async () => {
        await loading.dismiss();
        this.presentToast('Asignación eliminada correctamente.', 'success');
        this.removeItem(
          (item: AsignacionRecorrido) =>
            (item.idAsig || (item as any).id_asig) === idAsig
        );
      },
      error: async (error: any) => {
        await loading.dismiss();
        const errorMsg = error?.message || 'No se pudo eliminar la asignación.';
        this.showErrorAlert(
          'Error al Eliminar',
          `No se pudo eliminar la asignación: ${errorMsg}`
        );
      },
    });
  }

  async cambiarEstadoAsignacion(
    asignacion: AsignacionRecorrido,
    nuevoEstado: 'en_progreso' | 'completado' | 'cancelado'
  ) {
    const asignacionId = asignacion.idAsig || (asignacion as any).id_asig;
    if (asignacionId === undefined) return;

    // Obtenemos el estado actual
    const estadoActual = this.getEstado(asignacion);

    const modal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: `Confirmar ${this.getEstadoDisplay(nuevoEstado)}`,
        message:
          nuevoEstado === 'completado' &&
          estadoActual === 'en_progreso' &&
          asignacion.kmFinRecor == null
            ? `¿Confirmas finalizar este recorrido? Se registrará como completado y los KM finales se calcularán automáticamente.`
            : `¿Confirmas cambiar el estado a "${this.getEstadoDisplay(
                nuevoEstado
              )}"?`,
        icon: nuevoEstado === 'cancelado' ? 'warning' : 'help',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Confirmar', role: 'confirm' },
        ],
      },
      backdropDismiss: false,
      cssClass: 'custom-alert-modal',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data !== 'confirm') return;

    // Si estamos completando un recorrido en progreso, no exigimos KM finales
    // Esto permite que cualquier rol pueda marcar como completado un recorrido en progreso
    if (
      nuevoEstado === 'completado' &&
      estadoActual !== 'en_progreso' &&
      asignacion.kmFinRecor == null
    ) {
      this.showErrorAlert(
        'Falta Información',
        'Para marcar como "Completado", edita la asignación y registra los KM finales.'
      );
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: `Actualizando estado...`,
    });
    await loading.present();

    // Preparamos los datos a enviar al backend
    const updateData: any = { estadoAsig: nuevoEstado };

    // Si estamos completando un recorrido en progreso y no hay KM finales,
    // usamos los KM actuales del vehículo (se manejará en el backend)
    if (
      nuevoEstado === 'completado' &&
      estadoActual === 'en_progreso' &&
      asignacion.kmFinRecor == null
    ) {
      // Solo enviamos el cambio de estado, el backend puede manejar los KM finales
      // o podríamos agregar una flag para indicar que debe calcular los KM finales automáticamente
      updateData.actualizarKmAutomatico = true;
    }

    this.apiService
      .updateAsignacionRecorrido(asignacionId, updateData)
      .subscribe({
        next: async (updatedAsignacion) => {
          await loading.dismiss();
          this.presentToast(
            nuevoEstado === 'completado' &&
              estadoActual === 'en_progreso' &&
              updateData.actualizarKmAutomatico
              ? `Recorrido finalizado exitosamente. Los KM finales se han registrado automáticamente.`
              : `Estado actualizado a "${this.getEstadoDisplay(nuevoEstado)}".`,
            'success'
          );
          const index = this.allItems.findIndex(
            (a: AsignacionRecorrido) =>
              (a.idAsig || (a as any).id_asig) === asignacionId
          );
          if (index !== -1) {
            const updatedItems = [...this.allItems];
            updatedItems[index] = {
              ...updatedItems[index],
              ...updatedAsignacion,
            };
            this.baseListService.setItems(updatedItems);
            this.applyFilters();
          }
        },
        error: async (error: any) => {
          await loading.dismiss();
          this.showErrorAlert(
            'Error',
            `No se pudo actualizar el estado: ${error.message}`
          );
        },
      });
  }
  async presentToast(
    message: string,
    color: string = 'primary',
    duration: number = 3000
  ) {
    await this.mostrarToast(message, color, duration);
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
  getEstadoDisplay(estado: string | undefined | null): string {
    if (!estado) return 'Desconocido';
    return estado.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Método auxiliar para acceder al estado de forma segura
  getEstado(asignacion: any): string | undefined {
    // Intentar diferentes formatos de nombres de propiedades
    return asignacion?.estadoAsig || asignacion?.estado_asig || undefined;
  }

  getEstadoColor(asignacion: any): string {
    const estado = this.getEstado(asignacion);
    if (!estado) return 'medium';

    switch (estado) {
      case 'completado':
        return 'success';
      case 'en_progreso':
        return 'warning';
      case 'cancelado':
        return 'danger';
      case 'asignado':
        return 'secondary';
      default:
        return 'medium';
    }
  }
}
