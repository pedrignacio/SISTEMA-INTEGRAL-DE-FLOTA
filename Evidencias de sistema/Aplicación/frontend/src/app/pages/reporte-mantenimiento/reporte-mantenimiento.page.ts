// frontend/src/app/pages/reporte-mantenimiento/reporte-mantenimiento.page.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import {
  DataTableComponent,
  Column,
  ActionButton,
} from 'src/app/componentes/data-table/data-table.component';
import { ApiService, Vehiculo } from 'src/app/services/api.service';
import { addIcons } from 'ionicons';
import {
  downloadOutline,
  filterOutline,
  closeCircleOutline,
  documentOutline,
  documentTextOutline,
  refreshOutline,
  searchOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-reporte-mantenimiento',
  templateUrl: './reporte-mantenimiento.page.html',
  styleUrls: ['./reporte-mantenimiento.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, DataTableComponent],
})
export class ReporteMantenimientoPage implements OnInit {
  public reporteData: any[] = [];
  public filteredReporteData: any[] = [];
  public paginatedReporteData: any[] = [];
  public vehiculos: Vehiculo[] = [];
  public isLoading = true;
  public searchTerm = '';
  public pageSize = 10;
  public currentPage = 1;
  public isModalOpen = false; // Controla la visibilidad del modal
  public reporteSeleccionado: any = null; // Almacena el reporte seleccionado

  public filtros = {
    fechaDesde: '',
    fechaHasta: '',
    vehiculoId: null,
  };

  // Configuración de columnas para el data-table
  public tableColumns: Column[] = [
    { header: '# OT', field: 'id_ot', sortable: true, width: '80px' },
    {
      header: 'Vehículo',
      field: 'vehiculo',
      sortable: false,
      width: '150px',
      cell: (data: any) => data.vehiculo?.patente || 'N/A',
    },
    {
      header: 'Descripción',
      field: 'descripcion_ot',
      sortable: true,
      width: '200px',
    },
    {
      header: 'Encargado',
      field: 'encargado',
      sortable: false,
      width: '150px',
      cell: (data: any) =>
        data.encargado
          ? `${data.encargado.pri_nom_usu} ${data.encargado.pri_ape_usu}`
          : 'No asignado',
    },
    {
      header: 'Fecha Inicio',
      field: 'fec_ini_ot',
      sortable: true,
      width: '120px',
      cell: (data: any) =>
        data.fec_ini_ot
          ? new Date(data.fec_ini_ot).toLocaleDateString()
          : 'N/A',
    },
    {
      header: 'Fecha Fin',
      field: 'fec_fin_ot',
      sortable: true,
      width: '120px',
      cell: (data: any) =>
        data.fec_fin_ot
          ? new Date(data.fec_fin_ot).toLocaleDateString()
          : 'N/A',
    },
    {
      header: 'Estado',
      field: 'estado_ot',
      sortable: true,
      width: '120px',
      cell: (data: any) =>
        `<ion-chip class="status-${data.estado_ot}">${this.formatearEstado(
          data.estado_ot
        )}</ion-chip>`,
    },
  ];

  constructor(
    private apiService: ApiService,
    private toastController: ToastController
  ) {
    addIcons({
      downloadOutline,
      filterOutline,
      closeCircleOutline,
      documentOutline,
      documentTextOutline,
      refreshOutline,
      searchOutline,
    });
  }
  ngOnInit() {
    this.cargarVehiculos();
    this.cargarReporte();
  }

  cargarVehiculos() {
    this.apiService.getVehicles().subscribe({
      next: (data) => (this.vehiculos = data),
      error: (err) => console.error('Error al cargar vehículos', err),
    });
  }

  cargarReporte() {
    this.isLoading = true;
    this.apiService.getMantenimientoReport(this.filtros).subscribe({
      next: (data) => {
        this.reporteData = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar el reporte', err);
        this.isLoading = false;
        this.mostrarToast('Error al cargar el reporte.', 'danger');
      },
    });
  }

  applyFilters() {
    if (!this.searchTerm.trim()) {
      this.filteredReporteData = [...this.reporteData];
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredReporteData = this.reporteData.filter(
        (item) =>
          item.id_ot?.toString().includes(searchLower) ||
          item.vehiculo?.patente?.toLowerCase().includes(searchLower) ||
          item.descripcion_ot?.toLowerCase().includes(searchLower) ||
          item.encargado?.pri_nom_usu?.toLowerCase().includes(searchLower) ||
          item.encargado?.pri_ape_usu?.toLowerCase().includes(searchLower) ||
          item.estado_ot?.toLowerCase().includes(searchLower)
      );
    }
    this.updatePagination();
  }

  updatePagination() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedReporteData = this.filteredReporteData.slice(
      startIndex,
      endIndex
    );
  }

  onPageChange(event: any) {
    this.currentPage = event.page;
    this.pageSize = event.pageSize;
    this.updatePagination();
  }

  clearFilters() {
    this.searchTerm = '';
    this.applyFilters();
  }

  aplicarFiltros() {
    this.cargarReporte();
  }

  limpiarFiltros() {
    this.filtros = {
      fechaDesde: '',
      fechaHasta: '',
      vehiculoId: null,
    };
    this.searchTerm = '';
    this.cargarReporte();
  }
  exportarCSV() {
    if (this.filteredReporteData.length === 0) {
      this.mostrarToast('No hay datos para exportar.', 'warning');
      return;
    }

    const cabeceras = [
      'ID OT',
      'Patente Vehículo',
      'Marca',
      'Modelo',
      'Descripción',
      'Encargado',
      'Fecha Inicio',
      'Fecha Fin',
      'Estado',
    ];

    let csvContent = cabeceras.join(',') + '\r\n';

    this.filteredReporteData.forEach((row) => {
      const encargado = row.encargado
        ? `${row.encargado.pri_nom_usu} ${row.encargado.pri_ape_usu}`
        : 'No asignado';
      const fechaInicio = row.fec_ini_ot
        ? new Date(row.fec_ini_ot).toLocaleDateString()
        : 'N/A';
      const fechaFin = row.fec_fin_ot
        ? new Date(row.fec_fin_ot).toLocaleDateString()
        : 'N/A';

      const fila = [
        row.id_ot,
        row.vehiculo?.patente || 'N/A',
        row.vehiculo?.marca || 'N/A',
        row.vehiculo?.modelo || 'N/A',
        `"${row.descripcion_ot.replace(/"/g, '""')}"`, // Escapar comillas dobles
        `"${encargado}"`,
        fechaInicio,
        fechaFin,
        this.formatearEstado(row.estado_ot),
      ];
      csvContent += fila.join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'reporte_mantenimientos.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    this.mostrarToast('Archivo CSV exportado exitosamente', 'success');
  }

  exportarPDF() {
    if (this.filteredReporteData.length === 0) {
      this.mostrarToast('No hay datos para exportar.', 'warning');
      return;
    }

    // Crear contenido HTML para el PDF
    let htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Mantenimientos</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status-completada { color: #28a745; font-weight: bold; }
            .status-en_progreso { color: #ffc107; font-weight: bold; }
            .status-pendiente, .status-asignada { color: #007bff; font-weight: bold; }
            .status-cancelada { color: #dc3545; font-weight: bold; }
            .fecha { font-size: 12px; color: #666; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Reporte de Mantenimientos</h1>
          <div class="fecha">Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          <table>
            <thead>
              <tr>
                <th># OT</th>
                <th>Vehículo</th>
                <th>Descripción</th>
                <th>Encargado</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
    `;

    this.filteredReporteData.forEach((row) => {
      const encargado = row.encargado
        ? `${row.encargado.pri_nom_usu} ${row.encargado.pri_ape_usu}`
        : 'No asignado';
      const fechaInicio = row.fec_ini_ot
        ? new Date(row.fec_ini_ot).toLocaleDateString()
        : 'N/A';
      const fechaFin = row.fec_fin_ot
        ? new Date(row.fec_fin_ot).toLocaleDateString()
        : 'N/A';

      htmlContent += `
        <tr>
          <td>${row.id_ot}</td>
          <td>${row.vehiculo?.patente || 'N/A'}</td>
          <td>${row.descripcion_ot}</td>
          <td>${encargado}</td>
          <td>${fechaInicio}</td>
          <td>${fechaFin}</td>
          <td><span class="status-${row.estado_ot}">${this.formatearEstado(
        row.estado_ot
      )}</span></td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Crear y descargar el PDF usando la función de impresión del navegador
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Esperar a que se cargue el contenido antes de imprimir
      printWindow.onload = () => {
        printWindow.print();
        // Cerrar la ventana después de un breve delay
        setTimeout(() => printWindow.close(), 1000);
      };

      this.mostrarToast(
        'PDF generado. Use Ctrl+P para guardar como PDF',
        'success'
      );
    }
  }

  // Función auxiliar para mostrar mensajes
  async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
    });
    toast.present();
  }

  mostrarDetalles(reporte: any) {
    this.apiService.getOrdenTrabajoById(reporte.id_ot).subscribe({
      next: (ordenTrabajo) => {
        if (ordenTrabajo.detalles && ordenTrabajo.detalles.length > 0) {
          this.reporteSeleccionado = {
            ...reporte,
            tareas: ordenTrabajo.detalles.map((detalle) => ({
              descripcion: detalle.desc_det || 'Sin descripción',
              estado: detalle.estado || 'Sin estado', // Estado en tiempo real
              tecnico: detalle.tecnico
                ? `${detalle.tecnico.pri_nom_usu} ${detalle.tecnico.pri_ape_usu}`
                : 'Sin asignar',
            })),
          };
        } else {
          this.reporteSeleccionado = {
            ...reporte,
            tareas: [
              {
                descripcion: 'No hay tareas asociadas',
                estado: 'N/A',
                tecnico: 'N/A',
              },
            ],
          };
        }
        this.isModalOpen = true;
      },
      error: (err) => {
        console.error('Error al cargar las tareas de la OT', err);
        this.reporteSeleccionado = {
          ...reporte,
          tareas: [
            {
              descripcion: 'Error al cargar tareas',
              estado: 'N/A',
              tecnico: 'N/A',
            },
          ],
        };
        this.isModalOpen = true;
      },
    });
  }

  cerrarModal() {
    this.isModalOpen = false;
    this.reporteSeleccionado = null;
  }

  // Método para formatear los estados de mantenimiento
  formatearEstado(estado: string): string {
    if (!estado) return 'N/A';

    switch (estado.toLowerCase()) {
      case 'sin_iniciar':
        return 'Sin iniciar';
      case 'en_progreso':
        return 'En progreso';
      case 'completada':
        return 'Completada';
      case 'cancelada':
        return 'Cancelada';
      case 'rechazada':
        return 'Rechazada';
      default:
        return estado.charAt(0).toUpperCase() + estado.slice(1);
    }
  }
}
