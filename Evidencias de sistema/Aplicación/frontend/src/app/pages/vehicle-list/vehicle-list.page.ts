import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  LoadingController,
  ToastController,
  RefresherCustomEvent,
  NavController,
  ModalController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  pencilOutline,
  trashOutline,
  addCircleOutline,
  settingsOutline,
  searchOutline,
  carOutline,
  eyeOutline,
  newspaperOutline,
  add,
  closeCircleOutline,
  downloadOutline, // Importa el icono de descarga
  documentOutline, // Importa el icono de documento para PDF
} from 'ionicons/icons';

import {
  ApiService,
  Vehiculo,
  EstadoVehiculo,
} from '../../services/api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { TitleService } from '../../services/title.service';

import {
  DataTableComponent,
  Column,
  PageEvent,
  ActionButton,
} from '../../componentes/data-table/data-table.component';
import { VehicleFormPage } from '../vehicle-form/vehicle-form.page';
import { AlertaPersonalizadaComponent } from '../../componentes/alerta-personalizada/alerta-personalizada.component';

@Component({
  selector: 'app-vehicle-list',
  templateUrl: './vehicle-list.page.html',
  styleUrls: ['./vehicle-list.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, DataTableComponent],
})
export class VehicleListPage implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);
  private modalController = inject(ModalController);
  private titleService = inject(TitleService);

  vehiculos: Vehiculo[] = [];
  filteredVehiculos: Vehiculo[] = [];
  searchTerm: string = '';
  isLoading = false;

  pageTitle = 'Listado de Vehículos';
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
   filtroEstado: EstadoVehiculo | 'todos' = 'todos';
  opcionesDeEstado: Array<EstadoVehiculo | 'todos'> = [
    'todos',
    'activo',
    'inactivo',
    'mantenimiento',
    'taller',
  ];
  tableColumns: Column[] = [
    { header: 'Patente', field: 'patente', sortable: true },
    { header: 'Marca', field: 'marca', sortable: true },
    { header: 'Modelo', field: 'modelo', sortable: true },
    { header: 'Año', field: 'anio', sortable: true },
    {
      header: 'Estado',
      field: 'estadoVehi',
      sortable: true,
      cell: (data: Vehiculo) => this.getStatusBadge(data.estadoVehi),
    },
    {
      header: 'Kilometraje',
      field: 'kmVehi',
      sortable: true,
      cell: (data: Vehiculo) => `${data.kmVehi.toLocaleString('es-CL')} km`,
    },
    {
      header: 'Acciones',
      field: 'actions',
      width: '150px', 
      isAction: true,
    },
  ];
 statusCounts = {
    total: 0,
    activos: 0,
    mantenimiento: 0,
    taller: 0,
    inactivos: 0,
  };
  actionButtons: ActionButton[] = [
    {
      icon: 'eye-outline',
      color: 'primary',
      tooltip: 'Ver detalles',
      onClick: (row: Vehiculo) => this.goToViewVehicle(row.idVehi),
    },
    {
      icon: 'newspaper-outline',
      color: 'success', 
      tooltip: 'Ver historial',
      onClick: (row: Vehiculo) => this.verHistorial(row.idVehi),
    },
    {
      icon: 'pencil-outline',
      color: 'primary',
      tooltip: 'Editar vehículo',
      onClick: (row: Vehiculo) => this.goToEditVehicle(row.idVehi),
    },
    {
      icon: 'trash-outline',
      color: 'danger',
      tooltip: 'Eliminar vehículo',
      onClick: (row: Vehiculo) =>
        this.confirmDeleteVehicle(row.idVehi, row.patente),
    },
  ];

  constructor() {
    addIcons({
      pencilOutline,
      trashOutline,
      addCircleOutline,
      settingsOutline,
      searchOutline,
      carOutline,
      eyeOutline,
      newspaperOutline,
      closeCircleOutline,
      add,
      downloadOutline, // Añade el icono de descarga
      documentOutline, // Añade el icono de documento
    });
  }

  ngOnInit() {
    this.titleService.setTitle('Gestión de Vehículos');

      // Reemplazar completamente los action buttons
  this.actionButtons = [
    {
      icon: 'eye-outline',
      color: 'primary',
      tooltip: 'Ver detalles',
      onClick: (row: Vehiculo) => this.goToViewVehicle(row.idVehi),
    },
    {
      icon: 'map-outline',
      color: 'success',
      tooltip: 'Ver ubicación',
      onClick: (row: Vehiculo) => this.router.navigate(['/historial-vehiculo', row.idVehi]),
    },
    {
      icon: 'pencil-outline',
      color: 'tertiary',
      tooltip: 'Editar vehículo',
      onClick: (row: Vehiculo) => this.goToEditVehicle(row.idVehi),
    },
    {
      icon: 'close-circle-outline',
      color: 'danger',
      tooltip: 'Dar de baja vehículo',
      onClick: (row: Vehiculo) =>
        this.confirmDeleteVehicle(row.idVehi, row.patente),
    },

    // ... más botones
  ];

  }

  ionViewWillEnter() {
    this.loadVehicles();
  }

  async loadVehicles(showLoading = true, event?: RefresherCustomEvent) {
    let loadingIndicator: HTMLIonLoadingElement | undefined;
    if (showLoading && !event && !(await this.loadingController.getTop())) {
      this.isLoading = true;
      loadingIndicator = await this.loadingController.create({
        message: 'Cargando vehículos...',
      });
      await loadingIndicator.present();
    }

    // Si el filtro es 'todos', no pasamos ningún parámetro de estado a la API.
    const params = this.filtroEstado === 'todos' ? {} : { estado: this.filtroEstado };

    this.apiService.getVehicles(params).subscribe({
      next: (data: Vehiculo[]) => {
        this.vehiculos = data;
         this.calculateStatusCounts(); 
      this.applyFilters(); // Esta función ya refresca la lista, no necesita cambios.
        if (showLoading && !event) this.isLoading = false;
        if (loadingIndicator) loadingIndicator.dismiss();
        event?.target.complete();
      },
      error: async (error: HttpErrorResponse | Error) => {
        if (showLoading && !event) this.isLoading = false;
        if (loadingIndicator) loadingIndicator.dismiss();
        event?.target.complete();
        const message =
          error instanceof HttpErrorResponse
            ? error.error?.message || error.message
            : error.message;

        const modal = await this.modalController.create({
          component: AlertaPersonalizadaComponent,
          componentProps: {
            title: 'Error',
            message: `No se pudo cargar la lista de vehículos. ${message}`,
            icon: 'error',
            buttons: [{ text: 'Aceptar', role: 'confirm' }],
          },
          cssClass: 'custom-alert-modal',
        });
        await modal.present();
      },
    });
  }

  getStatusBadge(estadoVehi: EstadoVehiculo | string | undefined): string {
    const estado = estadoVehi ?? 'desconocido';
    const color = this.getStatusColor(estado);
    const estadoCapitalized = estado.charAt(0).toUpperCase() + estado.slice(1);
    return `<ion-badge color="${color}">${estadoCapitalized}</ion-badge>`;
  }
 private calculateStatusCounts(): void {
    this.statusCounts = {
      total: this.vehiculos.length,
      activos: this.vehiculos.filter(v => v.estadoVehi === 'activo').length,
      mantenimiento: this.vehiculos.filter(v => v.estadoVehi === 'mantenimiento').length,
      taller: this.vehiculos.filter(v => v.estadoVehi === 'taller').length,
      inactivos: this.vehiculos.filter(v => v.estadoVehi === 'inactivo').length,
    };
  }
  handleRefresh(event: RefresherCustomEvent) {
    this.loadVehicles(false, event);
  }

  async goToAddVehicle() {
    const modal = await this.modalController.create({
      component: VehicleFormPage,
      cssClass: 'vehicle-form-modal',
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.loadVehicles(false);
      }
    });

    return await modal.present();
  }

  async goToEditVehicle(idVehi?: number) {
    if (idVehi !== undefined) {
      const modal = await this.modalController.create({
        component: VehicleFormPage,
        componentProps: {
          vehicleId: idVehi,
          isEditMode: true,
        },
        cssClass: 'vehicle-form-modal',
      });

      modal.onDidDismiss().then((result) => {
        if (result.data) {
          this.loadVehicles(false);
        }
      });

      return await modal.present();
    } else {
      this.presentToast('No se especificó un ID para editar.', 'danger');
    }
  }

  async goToViewVehicle(idVehi?: number) {
    if (idVehi !== undefined) {
      const modal = await this.modalController.create({
        component: VehicleFormPage,
        componentProps: {
          vehicleId: idVehi,
          isViewMode: true,
        },
        cssClass: 'vehicle-form-modal',
      });
      return await modal.present();
    } else {
      this.presentToast('No se especificó un ID para visualizar.', 'danger');
    }
  }

  verHistorial(idVehi?: number) {
    if (idVehi !== undefined) {
      this.router.navigate(['/historial-vehiculo', idVehi]);
    } else {
      this.presentToast(
        'No se especificó un ID para ver el historial.',
        'danger'
      );
    }
  }

  async confirmDeleteVehicle(
    idVehi: number | undefined,
    patente: string | undefined
  ) {
    if (idVehi === undefined || patente === undefined) {
      this.presentToast(
        'Error: Datos del vehículo no válidos para eliminar.',
        'danger'
      );
      return;
    }

    const modal = await this.modalController.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: 'Dar de Baja',
        message: `¿Seguro que quieres dar de baja el vehículo con patente <strong>${patente}</strong>?`,
        icon: 'warning',
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'button-cancel' },
          { text: 'Dar de baja', role: 'confirm', cssClass: 'button-danger' },
        ],
      },
      backdropDismiss: false,
      cssClass: 'custom-alert-modal',
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data === 'confirm') {
      this.deleteVehicle(idVehi);
    }
  }

  private async deleteVehicle(idVehi: number) {
    const loading = await this.loadingController.create({
      message: 'Cambiando estado a "inactivo"...',
    });
    await loading.present();

    this.apiService.deleteVehicle(idVehi).subscribe({
      next: async (res: { message: string }) => {
        await loading.dismiss();
        this.presentToast('Vehículo dado de baja exitosamente.', 'success');
        this.loadVehicles(false);
      },
      error: async (error: HttpErrorResponse | Error) => {
        await loading.dismiss();
        const message =
          error instanceof HttpErrorResponse
            ? error.error?.message || error.message
            : error.message;

        const modal = await this.modalController.create({
          component: AlertaPersonalizadaComponent,
          componentProps: {
            title: 'Error al dar de baja',
            message: `No se pudo dar de baja el vehículo. ${message}`,
            icon: 'error',
            buttons: [{ text: 'Aceptar', role: 'confirm' }],
          },
          cssClass: 'custom-alert-modal',
        });
        await modal.present();
      },
    });
  }

  getStatusColor(estado: EstadoVehiculo | string): string {
    switch (estado) {
      case 'activo':
        return 'success';
      case 'inactivo':
        return 'medium';
      case 'mantenimiento':
        return 'warning';
      case 'taller':
        return 'danger';
      case 'baja': // Asegúrate de manejar el estado 'baja' si existe
        return 'dark'; 
      default:
        return 'light';
    }
  }

  async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger' | 'medium' = 'medium'
  ) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'bottom',
      color,
    });
    toast.present();
  }

  // Ahora DataTableComponent maneja la paginación interna.
  // Este getter ya no es necesario, puedes eliminarlo si DataTableComponent toma `filteredVehiculos` directamente.
  // get paginatedVehiculos(): Vehiculo[] {
  //   const start = (this.currentPage - 1) * this.pageSize;
  //   const end = start + this.pageSize;
  //   return this.filteredVehiculos.slice(start, end);
  // }

  onPageChange(event: PageEvent) {
    // Este evento es emitido por DataTableComponent, puedes usarlo si necesitas saber el estado de paginación
    // console.log('Página cambiada en DataTableComponent:', event);
    this.currentPage = event.pageIndex + 1; // Actualizar solo para referencia si es necesario
    this.pageSize = event.pageSize; // Actualizar solo para referencia si es necesario
  }
 onFilterChange() {
    this.currentPage = 1; // Resetea a la primera página al cambiar el filtro
    this.loadVehicles(true);
  }
  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredVehiculos = [...this.vehiculos];
    } else {
      this.filteredVehiculos = this.vehiculos.filter(
        (v) =>
          (v.patente && v.patente.toLowerCase().includes(term)) ||
          (v.marca && v.marca.toLowerCase().includes(term)) ||
          (v.modelo && v.modelo.toLowerCase().includes(term))
      );
    }
    // Ya no necesitas recalcular totalPages aquí, DataTableComponent lo hace
    // this.totalPages = Math.ceil(this.filteredVehiculos.length / this.pageSize) || 1;
    // this.currentPage = 1; // DataTableComponent ya reinicia la página
  }

  clearFilters() {
    this.searchTerm = '';
    this.applyFilters();
  }

  // Nuevas funciones para exportar CSV y PDF
  exportarCSV() {
    if (this.filteredVehiculos.length === 0) {
      this.presentToast('No hay datos de vehículos para exportar.', 'warning');
      return;
    }

    const cabeceras = [
      'Patente', 'Marca', 'Modelo', 'Año', 'Estado', 'Kilometraje', 'Tipo Vehículo', 'Tipo Combustible', 'Km Vida Útil', 'Eficiencia Combustible', 'Fecha Adquisición', 'Latitud', 'Longitud'
    ];

    let csvContent = cabeceras.join(',') + '\r\n';

    this.filteredVehiculos.forEach((row) => {
      const fila = [
        row.patente,
        row.marca,
        row.modelo,
        row.anio,
        row.estadoVehi,
        row.kmVehi,
        row.tipoVehi || 'N/A',
        row.tipoCombVehi || 'N/A',
        row.kmVidaUtil || 'N/A',
        row.efiComb || 'N/A',
        row.fecAdqui ? new Date(row.fecAdqui).toLocaleDateString() : 'N/A',
        row.latitud || 'N/A',
        row.longitud || 'N/A',
      ];
      // Escapar comillas dobles en cada celda para evitar problemas con comas internas
      csvContent += fila.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'reporte_vehiculos.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    this.presentToast('Archivo CSV de vehículos exportado exitosamente.', 'success');
  }

  exportarPDF() {
    if (this.filteredVehiculos.length === 0) {
      this.presentToast('No hay datos de vehículos para exportar.', 'warning');
      return;
    }

    let htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Vehículos</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status-activo { color: #28a745; font-weight: bold; }
            .status-inactivo { color: #6c757d; font-weight: bold; }
            .status-mantenimiento { color: #ffc107; font-weight: bold; }
            .status-taller { color: #dc3545; font-weight: bold; }
            .status-baja { color: #343a40; font-weight: bold; }
            .fecha { font-size: 12px; color: #666; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Reporte de Vehículos</h1>
          <div class="fecha">Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          <table>
            <thead>
              <tr>
                <th>Patente</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Año</th>
                <th>Estado</th>
                <th>Kilometraje</th>
                <th>Tipo Combustible</th>
              </tr>
            </thead>
            <tbody>
    `;

    this.filteredVehiculos.forEach((row) => {
      htmlContent += `
        <tr>
          <td>${row.patente}</td>
          <td>${row.marca}</td>
          <td>${row.modelo}</td>
          <td>${row.anio}</td>
          <td><span class="status-${row.estadoVehi}">${row.estadoVehi?.charAt(0).toUpperCase() + row.estadoVehi?.slice(1)}</span></td>
          <td>${row.kmVehi.toLocaleString('es-CL')} km</td>
          <td>${row.tipoCombVehi || 'N/A'}</td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      };

      this.presentToast(
        'PDF de vehículos generado. Use Ctrl+P para guardar como PDF',
        'success'
      );
    }
  }
}