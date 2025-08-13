import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  NavController,
  LoadingController,
  ToastController,
  AlertController,
  ModalController,
} from '@ionic/angular';
import { ApiService, OrdenTrabajoResumen } from 'src/app/services/api.service';
import { TitleService } from 'src/app/services/title.service';
import { AlertaPersonalizadaComponent } from '../../../componentes/alerta-personalizada/alerta-personalizada.component';
import { OrdenTrabajoDetallePage } from '../orden-trabajo-detalle/orden-trabajo-detalle.page';
import { BaseListPageComponent } from '../../../components/base-list-page.component';
import {
  BaseListService,
  FilterConfig,
} from '../../../services/base-list.service';

@Component({
  selector: 'app-orden-trabajo-list',
  templateUrl: './orden-trabajo-list.page.html',
  styleUrls: ['./orden-trabajo-list.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, DatePipe],
})
export class OrdenTrabajoListPage
  extends BaseListPageComponent<OrdenTrabajoResumen>
  implements OnInit
{
  private apiService = inject(ApiService);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);

  // Filtros específicos
  private _filterStatus: string = '';

  // Nueva propiedad para manejar las pestañas por estado
  selectedStatusTab: string = 'todas';

  // Filtros adicionales para fecha
  private _filterDateRange: { from?: string; to?: string } = {};

  constructor() {
    const baseListService = inject(BaseListService<OrdenTrabajoResumen>);
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
  get filterStatus(): string {
    return this._filterStatus;
  }

  set filterStatus(value: string) {
    this._filterStatus = value;
    this.setFilter('estado', value);
  }

  // Implementación de métodos abstractos
  getPageTitle(): string {
    return 'Órdenes de Trabajo';
  }
  getFilterConfig(): FilterConfig<OrdenTrabajoResumen> {
    return {
      searchFields: [
        'vehiculo.patente',
        'vehiculo.modelo',
        'vehiculo.marca',
        'id_ot',
      ] as any,
      customFilters: {
        estado: (item: OrdenTrabajoResumen, value: string) => {
          // Obtener el estado de forma segura
          const estado = item.estado_ot || (item as any).estadoOt;
          return !value || estado === value;
        },
        statusTab: (item: OrdenTrabajoResumen) => {
          if (this.selectedStatusTab === 'todas') return true;
          return item.estado_ot === this.selectedStatusTab;
        },
        dateRange: (orden: OrdenTrabajoResumen) => {
          if (!this._filterDateRange.from && !this._filterDateRange.to) {
            return true; // Sin filtro de fecha
          }

          const fechaInicio = orden.fec_ini_ot
            ? new Date(orden.fec_ini_ot)
            : null;

          // Si no hay fecha de inicio en la orden, no cumple filtro
          if (!fechaInicio) return false;

          // Comprobar límite inferior (from)
          if (this._filterDateRange.from) {
            const fromDate = new Date(this._filterDateRange.from);
            if (fechaInicio < fromDate) return false;
          }

          // Comprobar límite superior (to)
          if (this._filterDateRange.to) {
            const toDate = new Date(this._filterDateRange.to);
            // Ajustar la fecha hasta el final del día
            toDate.setHours(23, 59, 59, 999);
            if (fechaInicio > toDate) return false;
          }

          return true;
        },
      },
    };
  }

  async loadData(): Promise<OrdenTrabajoResumen[]> {
    return new Promise((resolve, reject) => {
      this.apiService.getOrdenesTrabajo().subscribe({
        next: (data) => {
          resolve(data);
        },
        error: (error) => reject(error),
      });
    });
  }

  get paginatedOrdenes() {
    return this.paginatedItems;
  }
  async verDetalle(idOt: number) {
    // En lugar de navegar a otra página, abrir un modal
    const modal = await this.modalCtrl.create({
      component: OrdenTrabajoDetallePage,
      componentProps: {
        ordenTrabajoId: idOt,
      },
      cssClass: 'orden-trabajo-modal',
      backdropDismiss: false,
    });

    await modal.present();

    // Manejar el cierre del modal
    const { data } = await modal.onDidDismiss();
    if (data && data.updated) {
      this.loadItems(); // Recargar la lista si se actualizó algo
    }
  }

  getIconForStatus(estado: string): string {
    switch (estado) {
      case 'completada':
      case 'completado':
        return 'checkmark-done-circle';
      case 'en_progreso':
        return 'reload-circle';
      case 'sin_iniciar':
        return 'time-outline';
      case 'rechazado':
        return 'ban';
      default:
        return 'help-circle';
    }
  }

  getColorForStatus(estado: string): string {
    switch (estado) {
      case 'completada':
      case 'completado':
        return 'success';
      case 'en_progreso':
        return 'warning';
      case 'sin_iniciar':
        return 'primary';
      case 'rechazado':
        return 'danger';
      default:
        return 'medium';
    }
  }
  // Función para mostrar los estados en formato legible
  getStatusDisplayName(estado: string | undefined): string {
    if (!estado) return 'Sin estado';

    const estadosDisplay: { [key: string]: string } = {
      sin_iniciar: 'Sin Iniciar',
      en_progreso: 'En Progreso',
      completada: 'Completada',
      completado: 'Completada',
      rechazado: 'Deshabilitada',
    };

    return estadosDisplay[estado] || estado;
  }

  // Método para validar fechas antes de aplicar el pipe date
  isValidDate(dateStr: any): boolean {
    if (!dateStr) return false;

    // Si es un string, verificar que tenga formato de fecha válido
    if (typeof dateStr === 'string') {
      // Intentar convertirlo a fecha
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }

    // Si ya es un objeto Date
    if (dateStr instanceof Date) {
      return !isNaN(dateStr.getTime());
    }

    return false;
  }
  // Método para mostrar mensajes toast
  async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger' | 'medium' = 'medium'
  ) {
    await this.mostrarToast(message, color);
  }

  // Método para abrir formulario de nueva orden (placeholder)
  abrirFormularioNuevaOrden() {
    // TODO: Implementar navegación o modal para crear nueva orden
    this.presentToast('Funcionalidad de nueva orden por implementar', 'medium');
  }

  // Método auxiliar para acceder al estado de forma segura
  getEstadoOT(orden: any): string | undefined {
    // Intentar diferentes formatos de nombres de propiedades
    return orden?.estado_ot || orden?.estadoOt || undefined;
  }
  getEstadoOTColor(orden: any): string {
    const estado = this.getEstadoOT(orden);
    if (!estado) return 'medium';
    return this.getColorForStatus(estado);
  }

  // Filtros adicionales para fecha
  get filterDateFrom(): string | undefined {
    return this._filterDateRange.from;
  }

  set filterDateFrom(value: string | undefined) {
    this._filterDateRange.from = value;
    this.applyDateFilter();
  }

  get filterDateTo(): string | undefined {
    return this._filterDateRange.to;
  }

  set filterDateTo(value: string | undefined) {
    this._filterDateRange.to = value;
    this.applyDateFilter();
  }

  // Método para aplicar el filtro de fecha
  applyDateFilter() {
    this.setFilter('dateRange', true); // Usar el filtro definido en getFilterConfig
    this.applyFilters();
  }

  // Ordenar órdenes de trabajo por número de OT descendente
  sortOrdenesTrabajo() {
    // Obtener los elementos paginados
    const items = [...this.paginatedItems];

    // Ordenar por ID de OT en orden descendente
    items.sort((a, b) => {
      const idA = a.id_ot || 0;
      const idB = b.id_ot || 0;
      return idB - idA; // Orden descendente
    });

    // Actualizar los elementos paginados con el nuevo orden
    // Esto se hace a través del servicio base
    this.baseListService['paginatedItemsSubject'].next(items);
  }

  // Sobrescribir loadItems para ordenar después de cargar
  override async loadItems(event?: any) {
    await super.loadItems(event);
    this.sortOrdenesTrabajo();
  }

  // Sobrescribir métodos de paginación para actualizar el orden
  override nextPage() {
    super.nextPage();
    this.sortOrdenesTrabajo();
  }

  override previousPage() {
    super.previousPage();
    this.sortOrdenesTrabajo();
  }

  // Métodos para manejar las pestañas por estado
  async onStatusTabChange(event: any) {
    console.log('Cambiando a pestaña:', event.detail.value);
    this.selectedStatusTab = event.detail.value;

    // Reseteamos la página actual
    this.goToPage(1);

    // Limpiamos todos los filtros relacionados con estado
    this._filterStatus = '';

    // Mostrar indicador de carga
    const loading = await this.loadingCtrl.create({
      message: 'Cargando órdenes de trabajo...',
    });
    await loading.present();

    try {
      // Recargar completamente los datos desde el servidor
      await this.loadItems();

      // IMPORTANTE: Activar el filtro por pestaña de manera explícita
      if (this.selectedStatusTab !== 'todas') {
        // Este es el punto clave: asegurar que el filtro statusTab se aplique correctamente
        this.baseListService.clearAllFilters(); // Limpiar filtros existentes
        this.baseListService.setFilter('statusTab', true); // Activar solo el filtro por pestaña
      } else {
        this.baseListService.clearAllFilters(); // En pestaña "todas" no aplicamos filtros
      }

      // Aplicar filtros después de recargar
      this.applyFilters();

      console.log(
        'Datos recargados y filtrados, items:',
        this.paginatedItems.length,
        'Estado seleccionado:',
        this.selectedStatusTab
      );
    } catch (error) {
      console.error('Error al recargar datos:', error);
      await this.mostrarToast(
        'Error al cargar los datos. Intente nuevamente.',
        'danger'
      );
    } finally {
      // Ocultar indicador de carga
      await loading.dismiss();
    }
  }

  // Método para ir a una página específica
  goToPage(page: number) {
    // Si el método no existe en la clase padre, implementa la lógica aquí
    // Por ejemplo, si tienes paginación basada en un servicio:
    if (
      this.baseListService &&
      typeof this.baseListService.setPage === 'function'
    ) {
      this.baseListService.setPage(page);
      this.applyFilters();
    } else {
      // Si tienes otra lógica de paginación, agrégala aquí
      console.warn('Método de paginación no implementado en la clase base.');
    }
  }

  // Método para contar órdenes por estado
  getCountByStatus(status: string): number {
    if (status === 'todas') {
      return this.paginatedItems.length;
    }

    return this.paginatedItems.filter((item) => item.estado_ot === status)
      .length;
  }

  // Método sobrescrito para aplicar filtros
  override applyFilters() {
    // NO es necesario llamar a setFilter('statusTab', true) aquí
    // porque el filtro depende de this.selectedStatusTab

    // Llamamos al método de la clase padre
    super.applyFilters();

    // Ordenamos después de filtrar
    this.sortOrdenesTrabajo();

    // Debug
    console.log('Filtros aplicados:', {
      tab: this.selectedStatusTab,
      resultados: this.paginatedItems.length,
    });
  }
}
