import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common'; // Asegúrate de tener CurrencyPipe y DecimalPipe importados
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartType,
  registerables,
} from 'chart.js';
import { ApiService } from 'src/app/services/api.service';
import { TitleService } from 'src/app/services/title.service'; // Asegúrate de importar TitleService si lo usas
import { addIcons } from 'ionicons';
import {
  carSportOutline,
  shieldCheckmarkOutline,
  buildOutline,
  alertCircleOutline,
  timerOutline,
  colorFillOutline, // Icono para combustible
  constructOutline, // Icono para mantenimiento
  speedometerOutline, // Icono para eficiencia
  mapOutline, // Icono para recorridos
  notificationsOutline, // Icono para alertas
} from 'ionicons/icons';
import { RouterModule } from '@angular/router';
// Ya no necesitamos forkJoin aquí si getDashboardKpis del backend ya trae todo
// import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  // Asegúrate de que los pipes estén en imports si los usas en el HTML
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    BaseChartDirective,
    CurrencyPipe,
    DecimalPipe,
    RouterModule,
  ],
})
export class DashboardPage implements OnInit {
  // Inicializa kpis con valores predeterminados para evitar errores de plantilla
  public kpis: any = {
    totalVehiculos: 0,
    vehiculosOperativos: 0,
    vehiculosEnTaller: 0,
    siniestrosMes: 0,
    costoCombustibleMes: 0,
    costoMantenimientoMes: 0,
    eficienciaCombustiblePromedio: 0,
    eficienciaCombustiblePeriodo: 0,
    vehiculosConEficiencia: 0,
    recorridosEnCurso: 0,
    alertasMantenimientoPendiente: 0,
    alertasSiniestrosPendientes: 0,
    vehiculosProximoMantenimiento: 0, // Asegúrate de incluir este si está en el backend
  };
  public isKpisLoading = true;

  isPieChartLoading = true;
  isBarChartLoading = true;

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const sum = context.chart.data.datasets[0].data.reduce(
              (a, b) => (a as number) + (b as number),
              0
            ) as number;
            const percentage =
              sum > 0 ? ((value / sum) * 100).toFixed(1) + '%' : '0%';
            return `${label}: ${value} (${percentage})`;
          },
        },
      },
    },
  };
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#428cff',
          '#32d7a3',
          '#5260ff',
          '#2dd36f',
          '#ffc409',
          '#ff8409',
          '#eb445a',
        ],
        hoverBackgroundColor: [
          '#589eff',
          '#48e4b3',
          '#6875ff',
          '#43e080',
          '#ffd03b',
          '#ff963b',
          '#ed576b',
        ],
        borderWidth: 1,
      },
    ],
  };
  public pieChartType: ChartType = 'pie';

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      x: {},
      y: {
        min: 0,
        ticks: {
          stepSize: 1,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            return ` Órdenes: ${context.parsed.y}`;
          },
        },
      },
    },
  };
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Órdenes de Trabajo',
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1,
        borderRadius: 5,
      },
    ],
  };
  public barChartType: ChartType = 'bar';

  constructor(
    private apiService: ApiService,
    private titleService: TitleService // Inyecta TitleService si lo utilizas
  ) {
    Chart.register(...registerables);
    addIcons({
      carSportOutline,
      shieldCheckmarkOutline,
      buildOutline,
      alertCircleOutline,
      timerOutline,
      colorFillOutline,
      constructOutline,
      speedometerOutline,
      mapOutline,
      notificationsOutline,
    });
  }

  ngOnInit() {
    this.titleService.setTitle('Dashboard - Gestión de Flota'); // Asegúrate de que TitleService esté inyectado si lo usas
    this.cargarDashboard();
  }

  ionViewWillEnter() {
    this.cargarDashboard();
  }

  cargarDashboard() {
    this.cargarKpis();
    this.cargarPieChart();
    this.cargarBarChart();
  }

  cargarKpis() {
    this.isKpisLoading = true;
    this.apiService.getDashboardKpis().subscribe({
      next: (data) => {
        // Asigna los datos directamente, ya que getDashboardKpis del backend
        // ya debería devolver un objeto con todas las propiedades de KPI
        this.kpis = {
          totalVehiculos: data.totalVehiculos || 0,
          vehiculosOperativos: data.vehiculosOperativos || 0,
          vehiculosEnTaller: data.vehiculosEnTaller || 0,
          siniestrosMes: data.siniestrosMes || 0,
          // Mapeo para los nuevos KPIs (asegúrate de que los nombres coincidan con el backend)
          costoCombustibleMes: data.costoCombustibleMes || 0,
          costoMantenimientoMes: data.costoMantenimientoMes || 0,
          eficienciaCombustiblePromedio:
            data.eficienciaCombustiblePromedio || 0,
          eficienciaCombustiblePeriodo: data.eficienciaCombustiblePeriodo || 0,
          vehiculosConEficiencia: data.vehiculosConEficiencia || 0,
          recorridosEnCurso: data.recorridosEnCurso || 0,
          alertasMantenimientoPendiente:
            data.alertasMantenimientoPendiente || 0,
          alertasSiniestrosPendientes: data.alertasSiniestrosPendientes || 0,
          vehiculosProximoMantenimiento:
            data.vehiculosProximoMantenimiento || 0, // Si este KPI está en el backend
        };
        this.isKpisLoading = false;
        console.log('KPIs cargados:', this.kpis); // LOG para verificar los valores cargados
      },
      error: (err) => {
        console.error('Error al cargar KPIs del dashboard', err);
        this.isKpisLoading = false;
        // Reinicia kpis a 0 en caso de error para evitar NaN o datos incorrectos
        this.kpis = {
          totalVehiculos: 0,
          vehiculosOperativos: 0,
          vehiculosEnTaller: 0,
          siniestrosMes: 0,
          costoCombustibleMes: 0,
          costoMantenimientoMes: 0,
          eficienciaCombustiblePromedio: 0,
          eficienciaCombustiblePeriodo: 0,
          vehiculosConEficiencia: 0,
          recorridosEnCurso: 0,
          alertasMantenimientoPendiente: 0,
          alertasSiniestrosPendientes: 0,
          vehiculosProximoMantenimiento: 0,
        };
      },
    });
  }

  cargarPieChart() {
    this.isPieChartLoading = true;
    this.apiService.getStatsVehiculosPorTipo().subscribe({
      next: (data) => {
        if (data?.labels?.length) {
          this.pieChartData.labels = data.labels;
          this.pieChartData.datasets[0].data = data.data;
        }
        this.isPieChartLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar datos del pie chart', err);
        this.isPieChartLoading = false;
      },
    });
  }

  cargarBarChart() {
    this.isBarChartLoading = true;
    this.apiService.getStatsMantenimientosPorEstado().subscribe({
      next: (data) => {
        if (data?.labels?.length) {
          this.barChartData.labels = data.labels;
          this.barChartData.datasets[0].data = data.data;

          const backgroundColors = data.labels.map((label: string) => {
            if (label.toLowerCase().includes('en progreso'))
              return 'rgba(255, 196, 9, 0.7)';
            if (label.toLowerCase().includes('completada'))
              return 'rgba(45, 211, 111, 0.7)';
            if (label.toLowerCase().includes('asignada'))
              return 'rgba(113, 73, 255, 0.7)';
            if (label.toLowerCase().includes('pendiente'))
              return 'rgba(56, 128, 255, 0.7)';
            return 'rgba(150, 150, 150, 0.7)';
          });

          const borderColors = backgroundColors.map((color: string) =>
            color.replace('0.7', '1')
          );
          this.barChartData.datasets[0].backgroundColor = backgroundColors;
          this.barChartData.datasets[0].borderColor = borderColors;
        }
        this.isBarChartLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar datos del bar chart', err);
        this.isBarChartLoading = false;
      },
    });
  }
}
