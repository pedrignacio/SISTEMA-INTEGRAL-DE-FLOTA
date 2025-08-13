import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  NavController,
  AlertController,
  ToastController,
  LoadingController,
  ModalController,
} from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  eyeOutline,
  createOutline,
  trashOutline,
  addCircleOutline,
  calendarOutline,
  listOutline,
  timeOutline,
  shieldCheckmarkOutline,
  powerOutline,
  documentTextOutline,
  checkboxOutline,
  carOutline,
  calendarNumberOutline,
  settingsOutline,
  add,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import {
  ApiService,
  PlanificacionMantenimientoResumen,
} from '../../../services/api.service';
import { BaseListPageComponent } from '../../../components/base-list-page.component';
import {
  BaseListService,
  FilterConfig,
} from '../../../services/base-list.service';
import { TitleService } from '../../../services/title.service';
import { AuthService } from '../../../services/auth.service';
import { PlanificacionFormPage } from '../planificacion-form/planificacion-form.page';
import { AlertaPersonalizadaComponent } from '../../../componentes/alerta-personalizada/alerta-personalizada.component';
import { OrdenTrabajoEventsService } from '../../../services/orden-trabajo-events.service';

@Component({
  selector: 'app-planificacion-list',
  templateUrl: './planificacion-list.page.html',
  styleUrls: ['./planificacion-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonicModule, DatePipe],
})
export class PlanificacionListPage
  extends BaseListPageComponent<PlanificacionMantenimientoResumen>
  implements OnInit
{
  constructor(
    baseListService: BaseListService<PlanificacionMantenimientoResumen>,
    toastCtrl: ToastController,
    loadingCtrl: LoadingController,
    modalCtrl: ModalController,
    titleService: TitleService,
    private apiService: ApiService,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private authService: AuthService,
    private otEventsService: OrdenTrabajoEventsService
  ) {
    super(baseListService, toastCtrl, loadingCtrl, modalCtrl, titleService);
    addIcons({
      eyeOutline,
      createOutline,
      trashOutline,
      addCircleOutline,
      calendarOutline,
      listOutline,
      timeOutline,
      shieldCheckmarkOutline,
      powerOutline,
      documentTextOutline,
      checkboxOutline,
      carOutline,
      calendarNumberOutline,
      settingsOutline,
      add,
    });
  }

  // Implementación de métodos abstractos
  getPageTitle(): string {
    return 'Planificación de Mantenimiento';
  }

  getFilterConfig(): FilterConfig<PlanificacionMantenimientoResumen> {
    return {
      searchFields: ['descPlan'],
      customFilters: {
        tipo: (plan, value) => {
          if (value === 'preventivo') return plan.esPreventivo === true;
          if (value === 'correctivo') return plan.esPreventivo === false;
          return true;
        },
        estado: (plan, value) => {
          if (value === 'activo') return plan.esActivoPlan === true;
          if (value === 'inactivo') return plan.esActivoPlan === false;
          return true;
        },
      },
    };
  }
  async loadData(): Promise<PlanificacionMantenimientoResumen[]> {
    try {
      const data = await firstValueFrom(this.apiService.getPlanificaciones());
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('Error al cargar planificaciones:', error);
      // Si hay un error 401, podríamos redirigir al login aquí
      if (error?.status === 401) {
        console.warn('Token expirado o no válido. Redirigiendo al login...');
        // Aquí podrías agregar lógica para redirigir al login
      }
      return []; // Retornar array vacío en caso de error
    }
  }

  // Getters y setters para filtros específicos
  get filterTipo() {
    return this.baseListService.filters['tipo'] || '';
  }

  set filterTipo(value: string) {
    this.setFilter('tipo', value);
  }

  get filterEstado() {
    return this.baseListService.filters['estado'] || '';
  }

  set filterEstado(value: string) {
    this.setFilter('estado', value);
  }

  // Getter para compatibilidad con template
  get paginatedPlanificaciones() {
    return this.paginatedItems;
  }

  override async ngOnInit() {
    await super.ngOnInit();
  }

  // Método para recargar datos
  async cargarPlanificaciones(event?: any) {
    await this.loadItems(event);
  }

  async generarOt(plan: PlanificacionMantenimientoResumen) {
    await this.closeAllSlidingItems();

    if (!plan.vehiculosEnPlan || plan.vehiculosEnPlan.length === 0) {
      this.mostrarToast(
        'Este plan no tiene vehículos asignados para generar una OT.',
        'warning'
      );
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.mostrarToast(
        'Error: No se pudo obtener la información del usuario actual.',
        'danger'
      );
      return;
    }
    const idUsuario = currentUser.idUsu;

    // ---- INICIO DE LA LÓGICA CORREGIDA ----

    // 1. Crear un mensaje dinámico para la confirmación
    const numVehiculos = plan.vehiculosEnPlan.length;
    const message =
      numVehiculos === 1
        ? `Se creará una OT para el vehículo <strong>${plan.vehiculosEnPlan[0].patente}</strong> a partir del plan "${plan.descPlan}". ¿Continuar?`
        : `Se generarán <strong>${numVehiculos} Órdenes de Trabajo</strong>, una para cada vehículo asociado al plan "${plan.descPlan}". ¿Continuar?`;

    // 2. Mostrar el modal de confirmación con el nuevo mensaje
    const modal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: 'Generar Órdenes de Trabajo',
        message: message,
        icon: 'help',
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'button-cancel' },
          { text: 'Generar', role: 'confirm', cssClass: 'confirm-button' },
        ],
      },
      backdropDismiss: false,
      cssClass: 'custom-alert-modal',
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data === 'confirm') {
      const loading = await this.loadingCtrl.create({
        message: 'Generando OTs...',
      });
      await loading.present();

      // 3. Extraer TODOS los IDs de los vehículos
      const vehiculosIds = plan.vehiculosEnPlan.map((v) => v.idVehi);

      // 4. Llamar a un NUEVO método en el ApiService (que crearemos en el siguiente paso)
      this.apiService
        .generarOtsParaPlan(plan.idPlan, vehiculosIds, idUsuario)
        .subscribe({
          next: async (res) => {
            await loading.dismiss();
            this.mostrarToast(
              res.message || `${numVehiculos} OT(s) generada(s) con éxito.`,
              'success'
            );
            // Opcional: podrías querer recargar los datos o navegar a otra página
          },
          error: async (err) => {
            await loading.dismiss();
            console.error('Error al generar las OTs:', err);
            // Este manejo de error puede mejorarse para mostrar detalles
            this.mostrarToast(
              err.error?.msg || 'No se pudieron generar las OTs.',
              'danger'
            );
          },
        });
    }
  }
  async irACrearPlan() {
    const modal = await this.modalCtrl.create({
      component: PlanificacionFormPage,
      cssClass: 'desktop-fullscreen',
    });

    modal.onDidDismiss().then((result) => {
      if (result.data && result.data.planificacionCreated) {
        this.cargarPlanificaciones();
      }
    });
    return await modal.present();
  }

  async verDetalle(plan: PlanificacionMantenimientoResumen) {
    await this.closeAllSlidingItems();

    const modal = await this.modalCtrl.create({
      component: PlanificacionFormPage,
      componentProps: {
        planId: plan.idPlan,
        isViewMode: true,
      },
      cssClass: 'desktop-fullscreen',
    });

    return await modal.present();
  }

  async editarPlan(plan: PlanificacionMantenimientoResumen) {
    await this.closeAllSlidingItems();

    const modal = await this.modalCtrl.create({
      component: PlanificacionFormPage,
      componentProps: {
        planId: plan.idPlan,
        isEditMode: true,
      },
      cssClass: 'desktop-fullscreen',
    });

    modal.onDidDismiss().then((result: any) => {
      if (result.data && result.data.planificacionUpdated) {
        this.cargarPlanificaciones();

        // Mostrar notificación adicional si se generaron OTs para vehículos nuevos
        if (
          result.data.otsGeneradasEnEdicion &&
          result.data.otsCreadas &&
          result.data.otsCreadas.length > 0
        ) {
          const numNuevosVehiculos = result.data.otsCreadas.length;
          this.mostrarToast(
            `Se ${
              numNuevosVehiculos === 1 ? 'generó' : 'generaron'
            } ${numNuevosVehiculos} ${
              numNuevosVehiculos === 1 ? 'orden' : 'órdenes'
            } de trabajo para ${
              numNuevosVehiculos === 1
                ? 'el vehículo nuevo'
                : 'los vehículos nuevos'
            }.`,
            'success'
          );
        }
      }
    });

    return await modal.present();
  }

  async confirmarEliminar(plan: PlanificacionMantenimientoResumen) {
    await this.closeAllSlidingItems();
    const modal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: 'Confirmar Eliminación',
        message: `¿Está seguro de que desea eliminar el plan "<strong>${plan.descPlan}</strong>"? Esta acción no se puede deshacer.`,
        icon: 'info', // Cambiado de 'warning' a 'info' para mostrar '?' en lugar de advertencia
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
      this.eliminarPlan(plan.idPlan);
    }
  }

  async eliminarPlan(planId: number) {
    const loading = await this.loadingCtrl.create({
      message: 'Eliminando plan...',
    });
    await loading.present();

    this.apiService.deletePlanificacion(planId).subscribe({
      next: async (response) => {
        await loading.dismiss();
        this.mostrarToast(
          response.message || 'Plan eliminado correctamente.',
          'success'
        );
        // Usar el método del servicio base para eliminar el elemento
        this.removeItem(
          (p: PlanificacionMantenimientoResumen) => p.idPlan === planId
        );
      },
      error: async (error) => {
        await loading.dismiss();
        this.mostrarToast(
          error.message || 'No se pudo eliminar el plan.',
          'danger'
        );
      },
    });
  }

  getIconForPlanStatus(plan: PlanificacionMantenimientoResumen): string {
    if (!plan.esActivoPlan) return 'eye-off-outline';
    return plan.esPreventivo ? 'shield-checkmark-outline' : 'build-outline';
  }

  getColorForPlanStatus(plan: PlanificacionMantenimientoResumen): string {
    if (!plan.esActivoPlan) return 'medium';
    return plan.esPreventivo ? 'success' : 'warning';
  }
}
