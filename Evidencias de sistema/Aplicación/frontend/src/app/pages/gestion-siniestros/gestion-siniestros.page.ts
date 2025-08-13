import { Component, OnInit, inject } from '@angular/core';
import {
  CommonModule,
  DatePipe,
  TitleCasePipe,
  SlicePipe,
} from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { ApiService, Siniestro } from '../../services/api.service';
import { HeaderComponent } from 'src/app/componentes/header/header.component';
import { SiniestroDetallePage } from '../siniestro-detalle/siniestro-detalle.page';
import {
  DataTableComponent,
  Column,
  ActionButton,
  PageEvent, // Nasken nga adda ti PageEvent ditoy
} from 'src/app/componentes/data-table/data-table.component'; 
import { addIcons } from 'ionicons';
import {
  eyeOutline,
  createOutline,
  trashOutline,
  add,
  refreshOutline,
  alertCircleOutline, 
  searchOutline, 
  funnelOutline, 
  documentTextOutline, 
  downloadOutline, 
  documentOutline, 
} from 'ionicons/icons';

@Component({
  selector: 'app-gestion-siniestros',
  templateUrl: './gestion-siniestros.page.html',
  styleUrls: ['./gestion-siniestros.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule, 
    HeaderComponent,
    DatePipe,
    TitleCasePipe, 
    SlicePipe,
    DataTableComponent, 
  ],
  providers: [TitleCasePipe] 
})
export class GestionSiniestrosPage implements OnInit {
  public siniestros: Siniestro[] = [];
  public filteredSiniestros: Siniestro[] = []; 
  public cargando = true;
  public skeletonItems = Array(5);

  public searchTerm: string = '';
  public filterStatus: string = '';
  public filterType: string = '';
  public pageSize: number = 10; 

  private apiService = inject(ApiService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  public tableColumns: Column[] = [
    { header: 'ID', field: 'id', sortable: true, width: '80px' },
    {
      header: 'Fecha',
      field: 'fecha',
      sortable: true,
      width: '120px',
      cell: (data: Siniestro) =>
        data.fecha ? new Date(data.fecha).toLocaleDateString() : 'N/A',
    },
    {
      header: 'Tipo',
      field: 'tipo',
      sortable: true,
      width: '100px',
      cell: (data: Siniestro) =>
        data.tipo ? data.tipo.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A', 
    },
    {
      header: 'Vehículo',
      field: 'vehiculo.patente',
      sortable: true,
      width: '120px',
      cell: (data: Siniestro) => data.vehiculo?.patente || 'N/A',
    },
    {
      header: 'Conductor',
      field: 'conductor.pri_nom_usu',
      sortable: true,
      width: '150px',
      cell: (data: Siniestro) =>
        data.conductor
          ? `${data.conductor.pri_nom_usu} ${data.conductor.pri_ape_usu}`
          : 'N/A',
    },
    {
      header: 'Descripción',
      field: 'descripcion',
      sortable: false,
      width: '250px',
      cell: (data: Siniestro) =>
        data.descripcion
          ? `${data.descripcion.slice(0, 100)}${
              data.descripcion.length > 100 ? '...' : ''
            }`
          : 'Sin descripción',
    },
    {
      header: 'Estado',
      field: 'estado',
      sortable: true,
      width: '120px',
      cell: (data: Siniestro) =>
        `<ion-chip class="status-${data.estado}">${
          this.titleCasePipe.transform(data.estado.replace('_', ' ')) 
        }</ion-chip>`,
    },
    { header: 'Acciones', field: 'actions', width: '100px', isAction: true },
  ];

  public actionButtons: ActionButton[] = [
    {
      icon: 'eye-outline',
      color: 'primary',
      tooltip: 'Ver Detalles',
      onClick: (row: Siniestro) => this.verDetalles(row.id),
    },
  ];

  constructor(private titleCasePipe: TitleCasePipe) { 
    addIcons({
      eyeOutline,
      createOutline,
      trashOutline,
      add,
      refreshOutline,
      alertCircleOutline,
      searchOutline,
      funnelOutline,
      documentTextOutline,
      downloadOutline,
      documentOutline,
    });
  }

  ngOnInit() {
    this.cargarSiniestros();
  }

  ionViewWillEnter() {
    this.cargarSiniestros();
  }

  cargarSiniestros() {
    this.cargando = true;
    console.log('[Gestión Siniestros] Iniciando carga de datos...');

    this.apiService.getSiniestros().subscribe({
      next: (data) => {
        console.log('[Gestión Siniestros] Datos recibidos del backend:', data);
        this.siniestros = data;
        this.applyFilters(); 
        this.cargando = false;
        console.log(
          `[Gestión Siniestros] Carga finalizada. Se recibieron ${data.length} registros.`
        );
      },
      error: (err) => {
        console.error(
          '[Gestión Siniestros] ¡ERROR! La petición al API falló:',
          err
        );
        this.cargando = false;
        this.mostrarToast('Error al cargar los incidentes.', 'danger');
      },
    });
  }

  applyFilters() {
    let tempSiniestros = [...this.siniestros];

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      tempSiniestros = tempSiniestros.filter(
        (s) =>
          s.tipo.toLowerCase().includes(term) ||
          s.descripcion?.toLowerCase().includes(term) ||
          s.vehiculo?.patente?.toLowerCase().includes(term) ||
          s.vehiculo?.marca?.toLowerCase().includes(term) ||
          s.vehiculo?.modelo?.toLowerCase().includes(term) ||
          s.conductor?.pri_nom_usu?.toLowerCase().includes(term) ||
          s.conductor?.pri_ape_usu?.toLowerCase().includes(term)
      );
    }

    if (this.filterStatus) {
      tempSiniestros = tempSiniestros.filter(
        (s) => s.estado === this.filterStatus
      );
    }

    if (this.filterType) {
      tempSiniestros = tempSiniestros.filter(
        (s) => s.tipo === this.filterType
      );
    }

    this.filteredSiniestros = tempSiniestros;
  }

  clearFilters() {
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterType = '';
    this.applyFilters(); 
  }

  // Nasken nga adda ti onPageChange ditoy
  onPageChange(event: PageEvent) {
    // Ti DataTableComponent ket mangmanage iti bagina a pagination, isu a,
    // mabalinmo nga usaren daytoy a function para kadagiti side effects
    // wenno no kayatmo a maammuan ti agdama a page iti parent component.
    console.log('Cambiar la página en DataTableComponent::', event);
    // No kayatmo ti mangmanehar iti pagination ti datos, kayatna a sawen nga
    // agawaska kadagiti data manipud iti backend segun ti pageIndex ken pageSize.
    // Ngem iti daytoy a kaso, intresamo ti intero a na-filter a data.
  }

  async verDetalles(id: number | undefined) {
    if (!id) {
      console.error(
        'El modal no está abierto, el ID siniestro no está definido.'
      );
      return;
    }

    const modal = await this.modalCtrl.create({
      component: SiniestroDetallePage,
      componentProps: {
        siniestroId: id,
      },
      cssClass: 'siniestro-detalle-modal',
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.refresh) {
      this.cargarSiniestros();
    }
  }

  goToReportSiniestro() {
    console.log('Vaya a la página/modal del informe siniestro');
    this.mostrarToast('Aún no se ha implementado ninguna función de informe siniestro.', 'info');
  }

  exportarCSV() {
    if (this.filteredSiniestros.length === 0) {
      this.mostrarToast('No se exportan datos de los siniestros.', 'warning');
      return;
    }

    const cabeceras = [
      'ID', 'Fecha', 'Tipo', 'Vehiculo', 'Conductor', 'Descripción', 'Estado',
      
    ];

    let csvContent = cabeceras.join(',') + '\r\n';

    this.filteredSiniestros.forEach((s: Siniestro) => {
      const fila = [
        s.id,
        s.fecha ? new Date(s.fecha).toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A',
        s.tipo,
        s.estado,
        s.vehiculo?.patente || 'N/A',
        s.vehiculo?.marca || 'N/A',
        s.vehiculo?.modelo || 'N/A',
        s.conductor?.pri_nom_usu || 'N/A',
        s.conductor?.pri_ape_usu || 'N/A',
        `"${s.descripcion?.replace(/"/g, '""') || ''}"`, 
        s.costoEstimado || 0
      ];
      csvContent += fila.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'reporte_siniestros.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    this.mostrarToast('El archivo CSV del siniestro exportado exitosamente.', 'success');
  }

  exportarPDF() {
    if (this.filteredSiniestros.length === 0) {
      this.mostrarToast('No se exportan datos siniestros.', 'warning');
      return;
    }

    let htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte del Siniestro</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status-reportado { color: #ffc107; font-weight: bold; }
            .status-en_revision { color: #007bff; font-weight: bold; }
            .status-resuelto { color: #28a745; font-weight: bold; }
            .status-cancelado { color: #dc3545; font-weight: bold; }
            .fecha-generacion { font-size: 12px; color: #666; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Reporte del Siniestro</h1>
          <div class="fecha-generacion">Naaramid idi: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString()}</div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Vehiculo</th>
                <th>Conductor</th>
                <th>Descripcion</th>
                <th>Estado</th>
                <th>Estimado de Gastos.</th>
              </tr>
            </thead>
            <tbody>
    `;

    this.filteredSiniestros.forEach((s: Siniestro) => {
      htmlContent += `
        <tr>
          <td>${s.id || 'N/A'}</td>
          <td>${s.fecha ? new Date(s.fecha).toLocaleDateString('es-CL') : 'N/A'}</td>
          <td>${s.tipo || 'N/A'}</td>
          <td><span class="status-${s.estado}">${this.titleCasePipe.transform(s.estado.replace('_', ' '))}</span></td> 
          <td>${s.vehiculo?.patente || 'N/A'}</td>
          <td>${s.conductor?.pri_nom_usu || 'N/A'} ${s.conductor?.pri_ape_usu || ''}</td>
          <td>${s.descripcion ? `${s.descripcion.slice(0, 50)}${s.descripcion.length > 50 ? '...' : ''}` : 'Awan deskripsion'}</td>
          <td>${s.costoEstimado || 0}</td>
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
      this.mostrarToast('Se ha creado el archivo PDF del siniestro. Usa Ctrl+P para guardarlo como PDF..', 'success');
    }
  }

  getColorForStatus(estado: string): string {
    switch (estado) {
      case 'reportado':
        return 'warning';
      case 'en_revision':
        return 'primary';
      case 'resuelto':
        return 'success';
      case 'cancelado':
        return 'medium';
      default:
        return 'light';
    }
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      color: color,
    });
    toast.present();
  }
}