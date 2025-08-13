// ========================================================================
// 1. ARCHIVO TypeScript: recorridos.page.ts (Modificado)
// ========================================================================

import {
  Component,
  OnInit,
  OnDestroy,
  NgZone,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import * as L from 'leaflet';

import { AuthService } from '../../services/auth.service';
import {
  ApiService,
  Vehiculo,
  Route as RutaInterface,
} from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  mapOutline,
  listOutline,
  gridOutline,
  carSport,
  carSportOutline,
  navigateOutline,
  checkmarkCircle,
  pauseCircle,
  timeOutline,
  add,
  locateOutline,
  locationOutline,
  refreshOutline,
  closeOutline,
  informationCircleOutline,
  buildOutline, // <-- ICONO AÑADIDO
  closeCircleOutline, // <-- ICONO AÑADIDO
} from 'ionicons/icons';

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;

interface VehiculoConDatosSimulacion extends Vehiculo {
  asignacionId?: number;
  nombreRutaSimulacion?: string;
}

// --- INTERFAZ MODIFICADA ---
// Se añaden propiedades para un manejo más claro del estado en la UI.
interface VehiculoConEstado extends Vehiculo {
  enRecorrido: boolean;
  rutaActual?: string;
  ultimaActualizacion?: Date;
  // Nuevas propiedades
  displayStatus: 'En Recorrido' | 'Disponible' | 'En Mantenimiento' | 'Inactivo';
  displayColor: 'success' | 'warning' | 'danger' | 'medium';
}

@Component({
  selector: 'app-recorridos',
  templateUrl: 'recorridos.page.html',
  styleUrls: ['recorridos.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  private map!: L.Map;
  private vehicleMarkers: { [vehicleId: number]: L.Marker } = {};
  private subscriptions = new Subscription();
  private queryParamsSubscription: Subscription | undefined;
  private navigationSubscription: Subscription | undefined;

  public vehiculoIdParaSeguir: number | null = null;
  private rutaIdParaDibujar: number | null = null;
  private asignacionIdContexto: number | null = null;
  private polylineRutaActual: L.Polyline | null = null;
  public nombreRutaMostrada: string | null = 'Mapa de Flota';

  public vistaActual: 'mapa' | 'lista' | 'ambos' = 'ambos';
  public filtroEstado: 'todos' | 'en_recorrido' | 'disponible' = 'todos';
  public vehiculosConEstado: VehiculoConEstado[] = [];
  public vehiculosFiltrados: VehiculoConEstado[] = [];
  public vehiculosEnRecorrido: VehiculoConEstado[] = [];
  public vehiculosDisponibles: VehiculoConEstado[] = [];

  private intersectionObserver: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private apiService: ApiService,
    private socketService: SocketService,
    private zone: NgZone,
    private authService: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    public navCtrl: NavController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      mapOutline,
      listOutline,
      gridOutline,
      carSport,
      carSportOutline,
      navigateOutline,
      checkmarkCircle,
      pauseCircle,
      timeOutline,
      add,
      locateOutline,
      locationOutline,
      refreshOutline,
      closeOutline,
      informationCircleOutline,
      buildOutline, // <-- ICONO AÑADIDO
      closeCircleOutline, // <-- ICONO AÑADIDO
    });
  }

  // ... (ngOnInit, ionViewWillEnter, y otros métodos de ciclo de vida sin cambios) ...

  // --- FUNCIÓN MODIFICADA ---
  // Ahora utiliza el nuevo método getVehicleDisplayInfo para asignar el estado correcto.
  private procesarVehiculosConEstado(vehiculos: Vehiculo[]) {
    console.log('[Recorridos] procesarVehiculosConEstado: Procesando vehículos', vehiculos.length);
    try {
      this.vehiculosConEstado = vehiculos.map((vehiculo) => {
        const statusInfo = this.getVehicleDisplayInfo(vehiculo);
        const rutaActual = this.obtenerRutaActual(vehiculo);

        return {
          ...vehiculo,
          enRecorrido: statusInfo.displayStatus === 'En Recorrido',
          rutaActual,
          ultimaActualizacion: new Date(),
          displayStatus: statusInfo.displayStatus,
          displayColor: statusInfo.displayColor,
        };
      });

      this.vehiculosEnRecorrido = this.vehiculosConEstado.filter(v => v.enRecorrido);
      this.vehiculosDisponibles = this.vehiculosConEstado.filter(v => v.displayStatus === 'Disponible');

      console.log('[Recorridos] procesarVehiculosConEstado: Resultados', {
        total: this.vehiculosConEstado.length,
        enRecorrido: this.vehiculosEnRecorrido.length,
        disponibles: this.vehiculosDisponibles.length,
      });

      this.actualizarVehiculosFiltrados();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('[Recorridos] procesarVehiculosConEstado: Error procesando vehículos', error);
      this.presentToast('Error procesando datos de vehículos', 'danger');
    }
  }

  // --- NUEVA FUNCIÓN ---
  // Lógica centralizada para determinar el estado, color e ícono a mostrar.
  private getVehicleDisplayInfo(vehiculo: Vehiculo): {
    displayStatus: 'En Recorrido' | 'Disponible' | 'En Mantenimiento' | 'Inactivo';
    displayColor: 'success' | 'warning' | 'danger' | 'medium';
  } {
    // El estado de la base de datos tiene la máxima prioridad.
    switch (vehiculo.estadoVehi) {
      case 'mantenimiento':
      case 'taller':
        return { displayStatus: 'En Mantenimiento', displayColor: 'warning' };
      case 'inactivo':
        return { displayStatus: 'Inactivo', displayColor: 'danger' };
      case 'activo':
        // Si está 'activo', verificamos si se está moviendo.
        const enRecorrido = this.determinarSiEstaEnRecorrido(vehiculo);
        if (enRecorrido) {
          return { displayStatus: 'En Recorrido', displayColor: 'success' };
        } else {
          return { displayStatus: 'Disponible', displayColor: 'medium' };
        }
      default:
        // Por defecto, si el estado no es conocido, lo marcamos como inactivo.
        return { displayStatus: 'Inactivo', displayColor: 'medium' };
    }
  }

  // --- NUEVA FUNCIÓN ---
  // Devuelve el nombre del ícono según el estado calculado.
  getIconForStatus(status: VehiculoConEstado['displayStatus']): string {
    switch (status) {
      case 'En Recorrido':
        return 'checkmark-circle';
      case 'En Mantenimiento':
        return 'build-outline';
      case 'Inactivo':
        return 'close-circle-outline';
      case 'Disponible':
      default:
        return 'pause-circle';
    }
  }
  
  // (El resto de tu código .ts, como `determinarSiEstaEnRecorrido`, `initMap`, `listenToSocketEvents`, etc., permanece igual)

  // ... (pegue aquí el resto de su archivo .ts desde ngOnInit hasta el final)
  ngOnInit() {
    console.log('[Recorridos] ngOnInit: Inicializando página de recorridos.');
    this.queryParamsSubscription = this.activatedRoute.queryParams.subscribe(
      (params) => {
        console.log(
          '[Recorridos] ngOnInit: Actualizando estado desde query params.',
          params
        );
        this.actualizarEstadoDesdeQueryParams(params);
      }
    );

    this.navigationSubscription = this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationEnd &&
            this.router.url.startsWith('/recorridos')
        )
      )
      .subscribe(() => {
        console.log('[Recorridos] ngOnInit: Detectado cambio de navegación.');
        const currentParams = this.activatedRoute.snapshot.queryParams;
        this.actualizarEstadoDesdeQueryParams(currentParams);
        if (this.map) {
          this.zone.run(async () => {
            console.log(
              '[Recorridos] ngOnInit: Configurando vista según query params.'
            );
            await this.configurarVistaSegunQueryParams();
          });
        }
      });
  }

  private actualizarEstadoDesdeQueryParams(params: any) {
    const nuevaAsignacionId = params['asignacionId']
      ? parseInt(params['asignacionId'], 10)
      : null;
    const nuevoVehiculoId = params['vehiculoId']
      ? parseInt(params['vehiculoId'], 10)
      : null;
    const nuevaRutaId = params['rutaId']
      ? parseInt(params['rutaId'], 10)
      : null;

    if (
      nuevaAsignacionId !== this.asignacionIdContexto ||
      nuevoVehiculoId !== this.vehiculoIdParaSeguir ||
      nuevaRutaId !== this.rutaIdParaDibujar
    ) {
      this.asignacionIdContexto = nuevaAsignacionId;
      this.vehiculoIdParaSeguir = nuevoVehiculoId;
      this.rutaIdParaDibujar = nuevaRutaId;
      this.nombreRutaMostrada = this.vehiculoIdParaSeguir
        ? 'Seguimiento de Recorrido...'
        : 'Mapa de Flota';
    }
  }

  ionViewWillEnter() {
    console.log(
      '[Recorridos] ionViewWillEnter: Página está a punto de entrar en vista.'
    );
    if (this.socketService.isConnected()) {
      console.log('[Recorridos] ionViewWillEnter: Socket ya conectado.');
      this.subscribeToAsignacionRoom();
    } else {
      console.log('[Recorridos] ionViewWillEnter: Conectando socket.');
      this.socketService.connect();
      const connectSub = this.socketService.listen('connect').subscribe(() => {
        console.log('[Recorridos] ionViewWillEnter: Socket conectado.');
        this.subscribeToAsignacionRoom();
      });
      this.subscriptions.add(connectSub);
    }
    this.listenToSocketEvents();
  }

  private subscribeToAsignacionRoom() {
    if (this.asignacionIdContexto) {
      this.socketService.emit('subscribeToAsignacion', {
        asignacionId: this.asignacionIdContexto,
      });
    }
  }
  ionViewDidEnter() {
    console.log('[Recorridos] ionViewDidEnter: Página ha entrado en vista.');
    setTimeout(async () => {
      if (!this.map && this.mapContainerRef?.nativeElement) {
        console.log('[Recorridos] ionViewDidEnter: Inicializando mapa.');
        await this.initMap();
        this.configurarObservers();
      } else if (this.map) {
        console.log(
          '[Recorridos] ionViewDidEnter: Invalidando tamaño del mapa.'
        );
        this.map.invalidateSize(true);
      }

      if (this.map) {
        console.log(
          '[Recorridos] ionViewDidEnter: Configurando vista según query params.'
        );
        await this.configurarVistaSegunQueryParams();
      } else {
        console.error(
          '[Recorridos] ionViewDidEnter: Falló la inicialización del mapa.'
        );
      }
    }, 200);
  }

  ionViewDidLeave() {
    console.log('[Recorridos] ionViewDidLeave: Página ha salido de la vista.');
    if (this.asignacionIdContexto) {
      console.log(
        '[Recorridos] ionViewDidLeave: Desuscribiendo de asignación.'
      );
      this.socketService.emit('unsubscribeFromAsignacion', {
        asignacionId: this.asignacionIdContexto,
      });
    }
  }
  ngOnDestroy() {
    console.log('[Recorridos] ngOnDestroy: Destruyendo página de recorridos.');
    this.queryParamsSubscription?.unsubscribe();
    this.navigationSubscription?.unsubscribe();
    this.subscriptions?.unsubscribe();

    // Desconectar observers
    this.desconectarObservers();

    if (this.asignacionIdContexto) {
      console.log('[Recorridos] ngOnDestroy: Desuscribiendo de asignación.');
      this.socketService.emit('unsubscribeFromAsignacion', {
        asignacionId: this.asignacionIdContexto,
      });
    }
    if (this.map) {
      console.log('[Recorridos] ngOnDestroy: Eliminando mapa.');
      this.map.remove();
    }
  }

  private async configurarVistaSegunQueryParams() {
    console.log(
      '[Recorridos] configurarVistaSegunQueryParams: Configurando vista según query params.'
    );
    if (!this.map) return;

    this.limpiarRutaAnteriorDelMapa();

    if (this.rutaIdParaDibujar) {
      console.log(
        '[Recorridos] configurarVistaSegunQueryParams: Dibujando ruta en mapa.'
      );
      await this.dibujarRutaEnMapa(this.rutaIdParaDibujar);
    }

    if (this.vehiculoIdParaSeguir) {
      console.log(
        '[Recorridos] configurarVistaSegunQueryParams: Limpiando marcadores excepto el vehículo a seguir.'
      );
      this.limpiarMarcadoresExcepto(this.vehiculoIdParaSeguir);
      await this.loadAndFocusSpecificVehicle(this.vehiculoIdParaSeguir);
    } else {
      console.log(
        '[Recorridos] configurarVistaSegunQueryParams: Mostrando mapa de flota.'
      );
      this.nombreRutaMostrada = 'Mapa de Flota';
      this.limpiarTodosLosMarcadores();
      await this.loadInitialVehicles();
    }
    this.cdr.detectChanges();
  }

  private limpiarRutaAnteriorDelMapa(): void {
    if (
      this.polylineRutaActual &&
      this.map?.hasLayer(this.polylineRutaActual)
    ) {
      this.map.removeLayer(this.polylineRutaActual);
    }
    this.polylineRutaActual = null;
  }

  private limpiarTodosLosMarcadores(): void {
    if (this.map) {
      Object.values(this.vehicleMarkers).forEach((marker) =>
        this.map.removeLayer(marker)
      );
    }
    this.vehicleMarkers = {};
  }

  private limpiarMarcadoresExcepto(idVehiculoAMantener: number): void {
    if (!this.map) return;
    for (const idStr in this.vehicleMarkers) {
      const id = parseInt(idStr, 10);
      if (id !== idVehiculoAMantener) {
        this.map.removeLayer(this.vehicleMarkers[id]);
        delete this.vehicleMarkers[id];
      }
    }
  }

  private async initMap(): Promise<void> {
    console.log('[Recorridos] initMap: Inicializando mapa.');
    if (this.map) {
      console.log(
        '[Recorridos] initMap: Invalidando tamaño del mapa existente.'
      );
      this.map.invalidateSize(true);
      return;
    }
    if (!this.mapContainerRef || !this.mapContainerRef.nativeElement) {
      console.error(
        '[Recorridos] initMap: ¡ERROR CRÍTICO! mapContainerRef o su nativeElement es undefined.'
      );
      return;
    }
    const mapContainer = this.mapContainerRef.nativeElement;
    try {
      const initialCoords: L.LatLngTuple = [-36.8201, -73.0443];
      const initialZoom = 13;
      this.map = L.map(mapContainer, {
        center: initialCoords,
        zoom: initialZoom,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 3,
      }).addTo(this.map);
      L.control
        .attribution({
          prefix:
            '<a href="https://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(this.map);

      await new Promise((resolve) => setTimeout(resolve, 300));
      if (this.map) {
        console.log('[Recorridos] initMap: Invalidando tamaño del mapa.');
        this.map.invalidateSize(true);
      }
    } catch (e) {
      console.error(
        '[Recorridos] initMap: Error durante la creación del mapa Leaflet:',
        e
      );
    }
  }
  private async loadInitialVehicles(): Promise<void> {
    console.log(
      '[Recorridos] loadInitialVehicles: Cargando vehículos iniciales.'
    );

    if (this.vehiculoIdParaSeguir) {
      console.log(
        '[Recorridos] loadInitialVehicles: Vehículo para seguir ya definido:',
        this.vehiculoIdParaSeguir
      );
      return;
    }

    try {
      const sub = this.apiService.getVehicles().subscribe({
        next: (vehiculos: Vehiculo[]) => {
          console.log(
            '[Recorridos] loadInitialVehicles: Vehículos cargados:',
            vehiculos.length
          );

          if (!vehiculos || vehiculos.length === 0) {
            console.warn(
              '[Recorridos] loadInitialVehicles: No se encontraron vehículos'
            );
            this.presentToast('No se encontraron vehículos', 'warning');
            return;
          }

          this.zone.run(() => {
            try {
              // Procesar vehículos para la lista con estado
              this.procesarVehiculosConEstado(vehiculos);

              // Actualizar marcadores en el mapa
              let marcadoresCreados = 0;
              vehiculos.forEach((vehiculo) => {
                if (vehiculo.idVehi !== undefined) {
                  this.updateMarker(vehiculo);
                  marcadoresCreados++;
                }
              });

              console.log(
                '[Recorridos] loadInitialVehicles: Marcadores creados:',
                marcadoresCreados
              );

              if (
                Object.keys(this.vehicleMarkers).length > 0 &&
                !this.polylineRutaActual
              ) {
                console.log(
                  '[Recorridos] loadInitialVehicles: Ajustando límites del mapa.'
                );
                this.fitMapToBounds();
              }
            } catch (error) {
              console.error(
                '[Recorridos] loadInitialVehicles: Error procesando vehículos:',
                error
              );
              this.presentToast('Error procesando vehículos', 'danger');
            }
          });
        },
        error: (err) => {
          console.error(
            '[Recorridos] loadInitialVehicles: Error cargando vehículos:',
            err
          );
          this.presentToast('Error al cargar vehículos', 'danger');
        },
      });

      this.subscriptions.add(sub);
    } catch (error) {
      console.error('[Recorridos] loadInitialVehicles: Error general:', error);
      this.presentToast('Error al inicializar carga de vehículos', 'danger');
    }
  }
  private async loadAndFocusSpecificVehicle(vehicleId: number): Promise<void> {
    console.log(
      `[Recorridos] loadAndFocusSpecificVehicle: Cargando y centrando vehículo ID ${vehicleId}.`
    );
    try {
      const vehiculo = await this.apiService.getVehicle(vehicleId).toPromise();
      if (vehiculo) {
        console.log(
          '[Recorridos] loadAndFocusSpecificVehicle: Vehículo cargado.',
          vehiculo
        );
        this.zone.run(() => {
          if (
            vehiculo.latitud != null &&
            vehiculo.longitud != null &&
            this.map &&
            !isNaN(vehiculo.latitud) &&
            !isNaN(vehiculo.longitud) &&
            vehiculo.latitud !== 0 &&
            vehiculo.longitud !== 0
          ) {
            // Solo actualizar marcador y centrar si tiene coordenadas válidas
            this.updateMarker(vehiculo);
            const newPosition: L.LatLngTuple = [
              vehiculo.latitud,
              vehiculo.longitud,
            ];
            console.log(
              '[Recorridos] loadAndFocusSpecificVehicle: Centrándose en el vehículo.',
              newPosition
            );
            this.map.setView(newPosition, 16);
            this.presentToast(
              `Vehículo encontrado en ubicación actual`,
              'success',
              2000
            );
          } else {
            // Vehículo sin coordenadas válidas - mantener vista actual
            console.warn(
              `[Recorridos] loadAndFocusSpecificVehicle: Vehículo ID ${vehicleId} sin coordenadas válidas.`,
              { latitud: vehiculo.latitud, longitud: vehiculo.longitud }
            );
            this.presentToast(
              'Vehículo sin ubicación GPS válida. Mostrando vista general.',
              'warning',
              4000
            ); // Volver a mostrar todos los vehículos disponibles
            this.centrarEnTodosLosVehiculos();
          }
        });
      } else {
        console.warn(
          `[Recorridos] loadAndFocusSpecificVehicle: Vehículo ID ${vehicleId} no encontrado.`
        );
        this.presentToast('Vehículo no encontrado en el servidor', 'warning');
        this.centrarEnTodosLosVehiculos();
      }
    } catch (error) {
      console.error(
        `[Recorridos] loadAndFocusSpecificVehicle: Error cargando vehículo ID ${vehicleId}.`,
        error
      );
      this.presentToast('Error al cargar datos del vehículo', 'danger');
      this.centrarEnTodosLosVehiculos();
    }
  }

  private listenToSocketEvents(): void {
    console.log(
      '[Recorridos] listenToSocketEvents: Configurando eventos de socket.'
    );
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    const vehicleUpdatedSub = this.socketService
      .listen<VehiculoConDatosSimulacion>('vehicleUpdated')
      .subscribe((vehiculoData) => {
        console.log(
          '[Recorridos] listenToSocketEvents: Actualización de vehículo recibida.',
          vehiculoData
        );
        this.zone.run(() => {
          if (
            this.asignacionIdContexto &&
            vehiculoData.asignacionId !== undefined &&
            vehiculoData.asignacionId !== this.asignacionIdContexto
          ) {
            return;
          }
          if (
            !this.asignacionIdContexto ||
            (vehiculoData.idVehi !== undefined &&
              vehiculoData.idVehi === this.vehiculoIdParaSeguir)
          ) {
            this.updateMarker(vehiculoData);
            if (
              this.vehiculoIdParaSeguir &&
              vehiculoData.idVehi === this.vehiculoIdParaSeguir &&
              this.map &&
              vehiculoData.latitud != null &&
              vehiculoData.longitud != null &&
              typeof vehiculoData.latitud === 'number' &&
              !isNaN(vehiculoData.latitud) &&
              typeof vehiculoData.longitud === 'number' &&
              !isNaN(vehiculoData.longitud) &&
              vehiculoData.latitud !== 0 &&
              vehiculoData.longitud !== 0
            ) {
              const newPosition: L.LatLngTuple = [
                vehiculoData.latitud,
                vehiculoData.longitud,
              ];
              console.log(
                '[Recorridos] listenToSocketEvents: Centrándose en el vehículo actualizado con coordenadas válidas.',
                newPosition
              );
              this.map.setView(newPosition, 16);
            } else if (
              this.vehiculoIdParaSeguir &&
              vehiculoData.idVehi === this.vehiculoIdParaSeguir &&
              (vehiculoData.latitud == null ||
                vehiculoData.longitud == null ||
                (typeof vehiculoData.latitud === 'number' &&
                  isNaN(vehiculoData.latitud)) ||
                (typeof vehiculoData.longitud === 'number' &&
                  isNaN(vehiculoData.longitud)) ||
                vehiculoData.latitud === 0 ||
                vehiculoData.longitud === 0)
            ) {
              console.warn(
                '[Recorridos] listenToSocketEvents: Vehículo seguido recibido sin coordenadas válidas, manteniendo vista actual.',
                {
                  id: vehiculoData.idVehi,
                  lat: vehiculoData.latitud,
                  lon: vehiculoData.longitud,
                }
              );
            }
            if (
              this.asignacionIdContexto &&
              vehiculoData.asignacionId === this.asignacionIdContexto &&
              vehiculoData.nombreRutaSimulacion &&
              this.nombreRutaMostrada !== vehiculoData.nombreRutaSimulacion &&
              !this.nombreRutaMostrada?.includes('(Finalizada)')
            ) {
              this.nombreRutaMostrada = vehiculoData.nombreRutaSimulacion;
              this.cdr.detectChanges();
            }
          }
        });
      });
    this.subscriptions.add(vehicleUpdatedSub);

    const createSub = this.socketService
      .listen<Vehiculo>('vehicleCreated')
      .subscribe((vehiculo) => {
        console.log(
          '[Recorridos] listenToSocketEvents: Vehículo creado.',
          vehiculo
        );
        if (
          !this.vehiculoIdParaSeguir ||
          (vehiculo.idVehi !== undefined &&
            vehiculo.idVehi === this.vehiculoIdParaSeguir)
        ) {
          this.zone.run(() => this.updateMarker(vehiculo));
        }
      });
    this.subscriptions.add(createSub);

    const deleteSub = this.socketService
      .listen<{ id: number }>('vehicleDeleted')
      .subscribe((data) => {
        console.log(
          '[Recorridos] listenToSocketEvents: Vehículo eliminado.',
          data
        );
        if (
          !this.vehiculoIdParaSeguir ||
          data.id === this.vehiculoIdParaSeguir
        ) {
          this.zone.run(() => this.removeMarker(data.id));
          if (data.id === this.vehiculoIdParaSeguir) {
            console.log(
              '[Recorridos] listenToSocketEvents: Vehículo seguido eliminado.'
            );
            this.presentToast(
              'El vehículo que estabas siguiendo ha sido eliminado.',
              'warning'
            );
            this.clearTrackingAndReturnToList();
          }
        }
      });
    this.subscriptions.add(deleteSub);

    const simEndedSub = this.socketService
      .listen<any>('simulationEnded')
      .subscribe((data) => {
        console.log(
          '[Recorridos] listenToSocketEvents: Simulación finalizada.',
          data
        );
        if (
          this.asignacionIdContexto &&
          data.asignacionId === this.asignacionIdContexto
        ) {
          this.presentToast(
            `Simulación para ${data.routeName || 'la ruta'} ha finalizado.`,
            'primary'
          );
          this.nombreRutaMostrada = `${data.routeName || 'Ruta'} (Finalizada)`;
          this.cdr.detectChanges();
        }
      });
    this.subscriptions.add(simEndedSub);

    const simErrorSub = this.socketService
      .listen<any>('simulationError')
      .subscribe((data) => {
        console.error(
          '[Recorridos] listenToSocketEvents: Error en simulación.',
          data
        );
        this.presentToast(
          `Error en simulación: ${
            data.message ? data.message : 'Error desconocido'
          }`,
          'danger'
        );
      });
    this.subscriptions.add(simErrorSub);
  }

  private async dibujarRutaEnMapa(rutaId: number): Promise<void> {
    console.log(
      `[Recorridos] dibujarRutaEnMapa: Dibujando ruta ID ${rutaId} en el mapa.`
    );
    if (!this.map) {
      return;
    }
    this.limpiarRutaAnteriorDelMapa();
    try {
      const rutaData = await this.apiService.getRoute(rutaId).toPromise();
      if (
        rutaData &&
        rutaData.puntosRuta &&
        Array.isArray(rutaData.puntosRuta) &&
        rutaData.puntosRuta.length > 0
      ) {
        const coordenadasLeaflet = rutaData.puntosRuta
          .map((p: any) =>
            Array.isArray(p) &&
            p.length === 2 &&
            typeof p[0] === 'number' &&
            typeof p[1] === 'number'
              ? [p[0], p[1]]
              : null
          )
          .filter((p) => p !== null) as L.LatLngExpression[];

        if (coordenadasLeaflet.length > 0) {
          this.polylineRutaActual = L.polyline(coordenadasLeaflet, {
            color: 'blue',
            weight: 4,
            opacity: 0.7,
          }).addTo(this.map);
          this.map.fitBounds(this.polylineRutaActual.getBounds().pad(0.1));
          this.nombreRutaMostrada =
            rutaData.nombreRuta || `Ruta #${rutaData.idRuta}`;
        } else {
          this.nombreRutaMostrada = `${
            rutaData.nombreRuta || `Ruta ${rutaId}`
          } (Sin trazado válido)`;
        }
      } else {
        this.nombreRutaMostrada = `Ruta ${rutaId} (No encontrada o sin puntos)`;
      }
    } catch (error) {
      this.nombreRutaMostrada = `Ruta ${rutaId} (Error al cargar)`;
      console.error(
        `[Recorridos] Error al obtener/dibujar la ruta ID ${rutaId}:`,
        error
      );
    }
    this.cdr.detectChanges();
  }
  private updateMarker(vehiculoData: VehiculoConDatosSimulacion): void {
    if (!this.map) {
      console.warn('[Recorridos] updateMarker: Mapa no disponible');
      return;
    }

    const { idVehi, latitud, longitud } = vehiculoData;
    // Validación más estricta de coordenadas
    if (
      idVehi === undefined ||
      latitud == null ||
      longitud == null ||
      (typeof latitud === 'number' && isNaN(latitud)) ||
      (typeof longitud === 'number' && isNaN(longitud)) ||
      latitud === 0 ||
      longitud === 0
    ) {
      console.warn(
        '[Recorridos] updateMarker: Datos de vehículo incompletos o coordenadas inválidas',
        {
          idVehi,
          latitud,
          longitud,
          isLatNaN:
            typeof latitud === 'number' ? isNaN(latitud) : 'not a number',
          isLonNaN:
            typeof longitud === 'number' ? isNaN(longitud) : 'not a number',
        }
      );
      return;
    }

    // Verificar si estamos siguiendo un vehículo específico
    if (
      this.vehiculoIdParaSeguir !== null &&
      idVehi !== this.vehiculoIdParaSeguir
    ) {
      return;
    }

    const position: L.LatLngTuple = [latitud, longitud];
    console.log(
      `[Recorridos] updateMarker: Actualizando marcador para vehículo ${idVehi}`,
      position
    );

    try {
      if (this.vehicleMarkers[idVehi]) {
        // Actualizar marcador existente
        const marker = this.vehicleMarkers[idVehi];
        marker.setLatLng(position);
        marker.setPopupContent(this.createPopupContent(vehiculoData));
        console.log(
          `[Recorridos] updateMarker: Marcador actualizado para vehículo ${idVehi}`
        );
      } else {
        // Crear nuevo marcador
        const newMarker = L.marker(position)
          .addTo(this.map)
          .bindPopup(this.createPopupContent(vehiculoData));

        this.vehicleMarkers[idVehi] = newMarker;
        console.log(
          `[Recorridos] updateMarker: Nuevo marcador creado para vehículo ${idVehi}`
        );

        // Agregar evento click al marcador
        newMarker.on('click', () => {
          console.log(
            `[Recorridos] Marcador clickeado para vehículo ${idVehi}`
          );
        });
      }

      // Si estamos siguiendo este vehículo, actualizar también la lista
      if (this.vehiculoIdParaSeguir === idVehi) {
        this.actualizarVehiculoEnLista(vehiculoData);
      }
    } catch (error) {
      console.error(
        `[Recorridos] updateMarker: Error actualizando marcador para vehículo ${idVehi}`,
        error
      );
    }
  }

  private actualizarVehiculoEnLista(vehiculoData: VehiculoConDatosSimulacion) {
    // Buscar y actualizar el vehículo en la lista
    const index = this.vehiculosConEstado.findIndex(
      (v) => v.idVehi === vehiculoData.idVehi
    );
    if (index !== -1) {
      // Usamos el nuevo método para obtener la información de estado correcta
      const statusInfo = this.getVehicleDisplayInfo(vehiculoData);
      this.vehiculosConEstado[index] = {
        ...this.vehiculosConEstado[index],
        ...vehiculoData,
        ultimaActualizacion: new Date(),
        displayStatus: statusInfo.displayStatus,
        displayColor: statusInfo.displayColor,
        enRecorrido: statusInfo.displayStatus === 'En Recorrido'
      };

      // Reprocessar las listas filtradas
      this.procesarVehiculosConEstado(this.vehiculosConEstado);
    }
  }

  private removeMarker(vehicleId: number): void {
    if (!this.map || !this.vehicleMarkers[vehicleId]) return;
    const marker = this.vehicleMarkers[vehicleId];
    if (this.map.hasLayer(marker)) {
      this.map.removeLayer(marker);
    }
    delete this.vehicleMarkers[vehicleId];
  }

  private createPopupContent(vehiculo: VehiculoConDatosSimulacion): string {
    const displayName =
      vehiculo.marca && vehiculo.modelo
        ? `${vehiculo.marca} ${vehiculo.modelo}`
        : vehiculo.patente || `Vehículo ${vehiculo.idVehi}`;

    const latitudNum = parseFloat(vehiculo.latitud as any);
    const longitudNum = parseFloat(vehiculo.longitud as any);

    const latStr = !isNaN(latitudNum) ? latitudNum.toFixed(6) : 'N/A';
    const lonStr = !isNaN(longitudNum) ? longitudNum.toFixed(6) : 'N/A';

    // --- POPUP MODIFICADO ---
    // Usamos el mismo método para obtener el estado real
    const statusInfo = this.getVehicleDisplayInfo(vehiculo);
    let html = `<b>${displayName}</b><br>`;
    if (vehiculo.patente) html += `Patente: ${vehiculo.patente}<br>`;
    if (statusInfo.displayStatus)
      html += `Estado: ${statusInfo.displayStatus}<br>`;

    let rutaEnPopup = '';
    if (
      this.nombreRutaMostrada &&
      this.polylineRutaActual &&
      vehiculo.idVehi === this.vehiculoIdParaSeguir
    ) {
      rutaEnPopup = this.nombreRutaMostrada;
    } else if (vehiculo.nombreRutaSimulacion) {
      rutaEnPopup = vehiculo.nombreRutaSimulacion + ' (Sim)';
    }
    if (rutaEnPopup) html += `Ruta: ${rutaEnPopup}<br>`;

    html += `<hr style="margin: 2px 0;">Lat: ${latStr}, Lon: ${lonStr}`;
    if (vehiculo.anio) html += `<br><small>Año: ${vehiculo.anio}</small>`;
    return html;
  }

  private fitMapToBounds(): void {
    if (!this.map || Object.keys(this.vehicleMarkers).length === 0) return;
    if (this.polylineRutaActual && this.vehiculoIdParaSeguir) return;
    const group = L.featureGroup(Object.values(this.vehicleMarkers));
    this.map.fitBounds(group.getBounds().pad(0.3));
  }

  centerOnTrackedVehicle() {
    if (
      this.vehiculoIdParaSeguir &&
      this.vehicleMarkers[this.vehiculoIdParaSeguir] &&
      this.map
    ) {
      const marker = this.vehicleMarkers[this.vehiculoIdParaSeguir];
      this.map.setView(
        marker.getLatLng(),
        this.map.getZoom() < 15 ? 15 : this.map.getZoom()
      );
    } else if (
      this.map &&
      Object.keys(this.vehicleMarkers).length > 0 &&
      !this.vehiculoIdParaSeguir
    ) {
      this.fitMapToBounds();
    } else {
      this.presentToast(
        'No hay vehículo específico para centrar o no hay marcadores.',
        'medium'
      );
    }
  }

  cambiarVista(event: any) {
    const nuevaVista = event.detail.value;
    console.log('[Recorridos] cambiarVista: Cambiando vista a', nuevaVista);
    this.vistaActual = nuevaVista;
    this.cdr.detectChanges();
  }

  cambiarFiltro(event: any) {
    this.filtroEstado = event.detail.value;
    this.actualizarVehiculosFiltrados();
  }
  private actualizarVehiculosFiltrados() {
    console.log(
      '[Recorridos] actualizarVehiculosFiltrados: Filtro actual',
      this.filtroEstado
    );

    switch (this.filtroEstado) {
      case 'en_recorrido':
        this.vehiculosFiltrados = [...this.vehiculosEnRecorrido];
        break;
      case 'disponible':
        this.vehiculosFiltrados = [...this.vehiculosDisponibles];
        break;
      default:
        this.vehiculosFiltrados = [...this.vehiculosConEstado];
        break;
    }

    console.log(
      '[Recorridos] actualizarVehiculosFiltrados: Vehículos filtrados',
      this.vehiculosFiltrados.length
    );

    // Forzar detección de cambios para actualizar la vista
    this.cdr.detectChanges();
  }

  private determinarSiEstaEnRecorrido(vehiculo: Vehiculo): boolean {
    return vehiculo.latitud != null && vehiculo.longitud != null;
  }

  private obtenerRutaActual(vehiculo: Vehiculo): string | undefined {
    return undefined;
  }
  seguirVehiculo(vehiculo: VehiculoConEstado) {
    console.log(
      '[Recorridos] seguirVehiculo: Iniciando seguimiento de vehículo',
      vehiculo
    );

    if (!vehiculo.idVehi) {
      console.warn(
        '[Recorridos] seguirVehiculo: Vehículo sin ID válido',
        vehiculo
      );
      this.presentToast('Error: Vehículo sin ID válido', 'danger');
      return;
    }

    try {
      // Actualizar estado de seguimiento
      this.vehiculoIdParaSeguir = vehiculo.idVehi;
      this.vistaActual = 'mapa';
      this.nombreRutaMostrada = `Siguiendo: ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})`;

      console.log('[Recorridos] seguirVehiculo: Estado actualizado', {
        vehiculoId: this.vehiculoIdParaSeguir,
        vista: this.vistaActual,
        nombre: this.nombreRutaMostrada,
      });

      // Asegurar que el mapa esté inicializado
      if (!this.map) {
        console.warn(
          '[Recorridos] seguirVehiculo: Mapa no inicializado, intentando inicializar...'
        );
        this.initMap().then(() => {
          this.procesarSeguimientoVehiculo(vehiculo);
        });
        return;
      }

      this.procesarSeguimientoVehiculo(vehiculo);
    } catch (error) {
      console.error(
        '[Recorridos] seguirVehiculo: Error durante el seguimiento',
        error
      );
      this.presentToast('Error al seguir vehículo', 'danger');
    }
  }
  private procesarSeguimientoVehiculo(vehiculo: VehiculoConEstado) {
    // Limpiar otros marcadores
    this.limpiarMarcadoresExcepto(vehiculo.idVehi!); // Verificar si el vehículo tiene coordenadas válidas
    const tieneCoordenadasValidas =
      vehiculo.latitud != null &&
      vehiculo.longitud != null &&
      typeof vehiculo.latitud === 'number' &&
      !isNaN(vehiculo.latitud) &&
      typeof vehiculo.longitud === 'number' &&
      !isNaN(vehiculo.longitud) &&
      vehiculo.latitud !== 0 &&
      vehiculo.longitud !== 0;

    if (tieneCoordenadasValidas) {
      const position: L.LatLngTuple = [vehiculo.latitud!, vehiculo.longitud!];
      console.log(
        '[Recorridos] procesarSeguimientoVehiculo: Centrando en posición válida',
        position
      );

      // Asegurar que el marcador esté actualizado
      this.updateMarker(vehiculo);

      // Centrar el mapa con animación suave
      this.map.setView(position, 16, { animate: true, duration: 1 });

      this.presentToast(
        `Siguiendo: ${vehiculo.marca} ${vehiculo.modelo}`,
        'success',
        2000
      );
    } else {
      console.warn(
        '[Recorridos] procesarSeguimientoVehiculo: Vehículo sin coordenadas válidas',
        {
          id: vehiculo.idVehi,
          latitud: vehiculo.latitud,
          longitud: vehiculo.longitud,
        }
      );

      // Mostrar mensaje de advertencia y mantener vista actual
      this.presentToast(
        `${vehiculo.marca} ${vehiculo.modelo} no tiene ubicación GPS válida. Intentando cargar desde servidor...`,
        'warning',
        4000
      );

      // Intentar cargar el vehículo específico desde el servidor
      this.loadAndFocusSpecificVehicle(vehiculo.idVehi!);
    }

    // Forzar detección de cambios
    this.cdr.detectChanges();

    // Invalidar tamaño del mapa después de un breve delay
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize(true);
      }
    }, 300);
  }
  centrarEnTodosLosVehiculos() {
    console.log(
      '[Recorridos] centrarEnTodosLosVehiculos: Reseteando vista a todos los vehículos'
    );
    this.vehiculoIdParaSeguir = null;
    this.nombreRutaMostrada = 'Mapa de Flota';
    this.loadInitialVehicles();

    // Usar un setTimeout para permitir que los marcadores se carguen
    setTimeout(() => {
      if (this.map && Object.keys(this.vehicleMarkers).length > 0) {
        this.fitMapToBounds();
        console.log(
          '[Recorridos] centrarEnTodosLosVehiculos: Mapa centrado en todos los vehículos disponibles'
        );
      } else {
        // Si no hay marcadores, centrar en una ubicación por defecto
        console.log(
          '[Recorridos] centrarEnTodosLosVehiculos: No hay vehículos con ubicación, usando vista por defecto'
        );
        this.map.setView([-33.4489, -70.6693], 10); // Santiago, Chile como ubicación por defecto
        this.presentToast(
          'No hay vehículos con ubicación GPS disponible',
          'warning',
          3000
        );
      }
    }, 500);
  }

  actualizarDatos() {
    this.loadInitialVehicles();
    this.presentToast('Datos actualizados', 'success', 2000);
  }

  limpiarSeguimiento() {
    this.vehiculoIdParaSeguir = null;
    this.asignacionIdContexto = null;
    this.rutaIdParaDibujar = null;
    this.nombreRutaMostrada = 'Mapa de Flota';
    this.limpiarRutaAnteriorDelMapa();
    this.loadInitialVehicles();
    this.router.navigate(['/recorridos'], { queryParams: {} });
  }

  logout() {
    this.authService.logout();
  }

  clearTrackingAndReturnToList() {
    if (this.asignacionIdContexto) {
      this.socketService.emit('unsubscribeFromAsignacion', {
        asignacionId: this.asignacionIdContexto,
      });
    }
    this.router.navigate(['/asignacion-list']);
  }
  async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger' | 'primary' | 'medium' = 'medium',
    duration: number = 3000
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'middle',
      mode: 'md',
    });
    toast.present();
  }
  // Método de debug para diagnosticar problemas
  debugEstadoAplicacion() {
    console.log('=== DEBUG ESTADO APLICACIÓN ===');
    console.log('Vista actual:', this.vistaActual);
    console.log('Filtro estado:', this.filtroEstado);
    console.log('Vehículo a seguir:', this.vehiculoIdParaSeguir);
    console.log('Nombre ruta mostrada:', this.nombreRutaMostrada);
    console.log('Mapa inicializado:', !!this.map);
    console.log('Vehículos con estado:', this.vehiculosConEstado.length);
    console.log('Vehículos filtrados:', this.vehiculosFiltrados.length);
    console.log('Vehículos en recorrido:', this.vehiculosEnRecorrido.length);
    console.log('Vehículos disponibles:', this.vehiculosDisponibles.length);
    console.log('Marcadores en mapa:', Object.keys(this.vehicleMarkers).length);

    // Debug de coordenadas de vehículos
    console.log('--- ANÁLISIS DE COORDENADAS ---');
    const vehiculosConCoordenadas = this.vehiculosConEstado.filter(
      (v) =>
        v.latitud != null &&
        v.longitud != null &&
        typeof v.latitud === 'number' &&
        !isNaN(v.latitud) &&
        typeof v.longitud === 'number' &&
        !isNaN(v.longitud) &&
        v.latitud !== 0 &&
        v.longitud !== 0
    );
    console.log(
      `Vehículos con coordenadas válidas: ${vehiculosConCoordenadas.length}/${this.vehiculosConEstado.length}`
    );

    if (this.vehiculoIdParaSeguir) {
      const vehiculoSeguido = this.vehiculosConEstado.find(
        (v) => v.idVehi === this.vehiculoIdParaSeguir
      );
      if (vehiculoSeguido) {
        console.log('Vehículo siendo seguido:', {
          id: vehiculoSeguido.idVehi,
          marca: vehiculoSeguido.marca,
          modelo: vehiculoSeguido.modelo,
          patente: vehiculoSeguido.patente,
          latitud: vehiculoSeguido.latitud,
          longitud: vehiculoSeguido.longitud,
          tieneCoordenadasValidas: vehiculosConCoordenadas.some(
            (v) => v.idVehi === vehiculoSeguido.idVehi
          ),
        });
      }
    }

    console.log('=== FIN DEBUG ===');

    // Mostrar resumen al usuario
    this.presentToast(
      `Debug: ${this.vehiculosConEstado.length} vehículos, ${vehiculosConCoordenadas.length} con GPS válido`,
      'primary',
      4000
    );
  }

  // Método para verificar si un vehículo tiene ubicación GPS válida
  tieneUbicacionValida(vehiculo: VehiculoConEstado): boolean {
    return (
      vehiculo.latitud != null &&
      vehiculo.longitud != null &&
      typeof vehiculo.latitud === 'number' &&
      !isNaN(vehiculo.latitud) &&
      typeof vehiculo.longitud === 'number' &&
      !isNaN(vehiculo.longitud) &&
      vehiculo.latitud !== 0 &&
      vehiculo.longitud !== 0
    );
  }

  // Método para mejorar el rendimiento del *ngFor
  trackByVehiculoId(index: number, vehiculo: VehiculoConEstado): number {
    return vehiculo.idVehi || index;
  }

  private configurarObservers() {
    if (!this.mapContainerRef?.nativeElement) return;

    // Configurar IntersectionObserver para detectar cuando el mapa se hace visible
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && this.map) {
            console.log(
              '[Recorridos] Observer: Mapa se hizo visible, refrescando...'
            );
            setTimeout(() => {
              if (this.map) {
                this.map.invalidateSize(true);
              }
            }, 100);
          }
        });
      },
      {
        threshold: 0.1, // Se activa cuando al menos 10% del mapa es visible
      }
    );

    this.intersectionObserver.observe(this.mapContainerRef.nativeElement);

    // Configurar ResizeObserver para detectar cambios de tamaño
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver((entries) => {
        if (this.map && entries.length > 0) {
          console.log(
            '[Recorridos] Observer: Contenedor cambió de tamaño, refrescando mapa...'
          );
          setTimeout(() => {
            if (this.map) {
              this.map.invalidateSize(true);
            }
          }, 50);
        }
      });

      this.resizeObserver.observe(this.mapContainerRef.nativeElement);
    }
  }

  private desconectarObservers() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}