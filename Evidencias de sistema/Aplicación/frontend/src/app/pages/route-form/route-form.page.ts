// src/app/pages/route-form/route-form.page.ts

import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  ChangeDetectorRef,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  IonicModule,
  LoadingController,
  AlertController,
  ToastController,
  NavController,
  ModalController,
} from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { ApiService, Route, OsrmRouteData } from '../../services/api.service';
import { addIcons } from 'ionicons';
import {
  save,
  navigateCircleOutline,
  locationOutline,
  calculatorOutline,
  trashOutline,
  closeCircleOutline,
  speedometerOutline,
  close,
  timeOutline,
  carOutline,
  expandOutline,
  contractOutline,
} from 'ionicons/icons';

// Importar el componente de alertas personalizadas
import { AlertaPersonalizadaComponent } from '../../componentes/alerta-personalizada/alerta-personalizada.component';

@Component({
  selector: 'app-route-form',
  templateUrl: './route-form.page.html',
  styleUrls: ['./route-form.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class RouteFormPage implements OnInit, AfterViewInit, OnDestroy {
  // --- Inyecciones ---
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private navCtrl = inject(NavController);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private modalCtrl = inject(ModalController);
  // --- Propiedades del formulario y estado ---
  @Input() routeId: number | null = null; // Para recibir ID desde modal
  @Input() isEditMode: boolean = false; // Para recibir modo desde modal
  @Input() isViewMode: boolean = false;
  routeForm!: FormGroup;
  pageTitle = 'Nueva Ruta';
  isLoading = false;
  isSubmitted = false;
  private tooltipAdded = false;

  // --- Propiedades para el Mapa Interactivo ---
  @ViewChild('routeMap') routeMapRef!: ElementRef<HTMLDivElement>;
  private routeMap!: L.Map;
  private origenMarker: L.Marker | null = null;
  private destinoMarker: L.Marker | null = null;
  public origenCoords: L.LatLngTuple | null = null;
  public destinoCoords: L.LatLngTuple | null = null;
  private routePolyline: L.Polyline | null = null;
  public calculatedPoints: L.LatLngTuple[] | null = null;
  public isCalculatingRoute = false;
  // Añadir estas propiedades a tu clase
  public origenLocationName: string = '';
  public destinoLocationName: string = '';
  public routeCalculationError: string | null = null;
  // --- NUEVAS Propiedades para Distancia y Duración ---
  public calculatedDistance: number | null = null; // En KM
  public calculatedDuration: number | null = null; // En minutos (para mostrar y guardar)
  public isMapExpanded = false; // NUEVO: Estado de expansión del mapa
  constructor() {
    addIcons({
      save,
      navigateCircleOutline,
      locationOutline,
      calculatorOutline,
      trashOutline,
      closeCircleOutline,
      speedometerOutline,
      close,
      timeOutline,
      carOutline,
      expandOutline,
      contractOutline,
    });
  }
  ngOnInit() {
    this.routeForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
    });

    // Verificar si se recibieron parámetros via modal (Input properties)
    if (this.routeId && (this.isEditMode || this.isViewMode)) {
      this.pageTitle = this.isViewMode ? 'Ver Ruta' : 'Editar Ruta';
      this.loadRouteData();

      // Calcular distancia automáticamente si es modo edición
      if (this.origenCoords && this.destinoCoords) {
        this.calculateRoute(false);
      }
    } else {
      // Fallback: verificar parámetros de ruta (para navegación directa)
      const idParam = this.activatedRoute.snapshot.paramMap.get('id');
      if (idParam) {
        this.isEditMode = true;
        this.routeId = parseInt(idParam, 10);
        this.pageTitle = 'Editar Ruta';
        this.loadRouteData();

        // Calcular distancia automáticamente si es modo edición
        if (this.origenCoords && this.destinoCoords) {
          this.calculateRoute(false);
        }
      }
    }
  }

  private getLocationName(coords: L.LatLngTuple): Promise<string> {
    const [lat, lng] = coords;
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    return fetch(url, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'CAPSTONE_App/1.0',
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data && data.display_name) {
          // Extraer información relevante
          const parts = data.display_name.split(',');
          // Usar los primeros 3 elementos para tener una descripción concisa
          return parts.slice(0, 3).join(',');
        }
        return 'Ubicación desconocida';
      })
      .catch((error) => {
        console.error('Error en geocodificación inversa:', error);
        return 'Error al obtener ubicación';
      });
  }

  // Getter para acceder fácilmente a los controles del formulario
  get f() {
    return this.routeForm.controls;
  }

  private async handleError(
    title: string,
    message: string,
    closeAfter: boolean = false
  ) {
    const errorModal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: title,
        message: message,
        icon: 'error',
        buttons: [{ text: 'Aceptar', role: 'confirm' }],
      },
      cssClass: 'custom-alert-modal',
    });
    await errorModal.present();

    if (closeAfter) {
      this.closeModal();
    }
  }

  // Método consolidado para crear marcadores
  private createMarker(
    coords: L.LatLngTuple,
    type: 'origen' | 'destino'
  ): L.Marker {
    const isOrigin = type === 'origen';

    return L.marker(coords, {
      icon: L.divIcon({
        className: isOrigin ? 'origin-marker' : 'destination-marker',
        html: `<ion-icon name="${
          isOrigin ? 'navigate-circle-outline' : 'location-outline'
        }" 
               style="font-size: 30px; color: ${
                 isOrigin ? 'green' : 'red'
               };"></ion-icon>`,
        iconSize: [30, 30],
        iconAnchor: isOrigin ? [15, 15] : [15, 30],
      }),
      draggable: true,
    })
      .addTo(this.routeMap)
      .on('dragend', (e) => this.handleMarkerDragEnd(e, type));
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.routeMap) {
      this.routeMap.off('click');
      this.routeMap.remove();
      console.log('Mapa del formulario eliminado.');
    }
  }
  private initMap(): void {
    if (this.routeMapRef && !this.routeMap) {
      // Inicializar el mapa en Concepción, Chile
      const concepcionCoords: L.LatLngTuple = [-36.7953, -73.0626];

      this.routeMap = L.map('routeFormMap').setView(concepcionCoords, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.routeMap);

      // Solo añadir el listener de clic si está en modo expandido
      this.updateMapClickListener();
    }
  }

  private handleMapDblClick(e: L.LeafletMouseEvent): void {
    // Detener la propagación del evento para evitar que afecte otros comportamientos
    L.DomEvent.stopPropagation(e);

    if (e.originalEvent) {
      e.originalEvent.stopPropagation();
      e.originalEvent.preventDefault();
    } // Solo procesar clics si estamos en modo expandido y no en modo vista
    if (!this.isMapExpanded || this.isViewMode) return;

    const clickedCoords: L.LatLngTuple = [e.latlng.lat, e.latlng.lng];

    // Mostrar pequeña animación de confirmación en el punto seleccionado
    const pulseMarker = L.marker(clickedCoords, {
      icon: L.divIcon({
        className: 'pulse-marker',
        html: '<div class="pulse-effect"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    }).addTo(this.routeMap);

    setTimeout(() => {
      this.routeMap.removeLayer(pulseMarker);
    }, 800);

    if (!this.origenCoords) {
      // Establecer punto de origen
      this.origenCoords = clickedCoords;
      // Obtener el nombre de la ubicación
      this.getLocationName(clickedCoords).then((name) => {
        this.origenLocationName = name;
        this.changeDetectorRef.detectChanges();
      }); // Crear marcador de origen
      this.origenMarker = this.createMarker(this.origenCoords, 'origen');

      this.presentToast(
        'Origen marcado. Ahora haz doble clic para marcar el destino.',
        'success'
      );
    } else if (!this.destinoCoords) {
      // Establecer punto de destino
      this.destinoCoords = clickedCoords;
      // Obtener el nombre de la ubicación
      this.getLocationName(clickedCoords).then((name) => {
        this.destinoLocationName = name;
        this.changeDetectorRef.detectChanges();
      }); // Crear marcador de destino
      this.destinoMarker = this.createMarker(this.destinoCoords, 'destino');

      // Si tenemos origen y destino, calcular la ruta
      this.calculateRoute();
    }

    this.changeDetectorRef.detectChanges();
  }
  // Método para actualizar el listener de clic según el estado del mapa
  private updateMapClickListener(): void {
    if (this.routeMap) {
      // Eliminar cualquier listener existente
      this.routeMap.off('click');
      this.routeMap.off('dblclick');

      // Solo añadir el listener si el mapa está expandido y no está en modo vista
      if (this.isMapExpanded && !this.isViewMode) {
        // Agregar un listener específico para doble clic que no se propague
        this.routeMap.on('dblclick', (e: L.LeafletMouseEvent) => {
          // Detener la propagación
          L.DomEvent.stopPropagation(e);
          if (e.originalEvent) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
          }

          // Manejar el doble clic para agregar puntos
          this.handleMapDblClick(e);
        });

        // Agregar también un listener para clics simples que evite propagación
        this.routeMap.on('click', (e: L.LeafletMouseEvent) => {
          // Solo detener propagación, no hacer nada más
          L.DomEvent.stopPropagation(e);
          if (e.originalEvent) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
          }
        });

        // Mostrar un pequeño tooltip para informar al usuario
        if (!this.tooltipAdded) {
          const tooltipControl = new L.Control({ position: 'topright' });
          tooltipControl.onAdd = () => {
            const div = L.DomUtil.create('div', 'map-tooltip');
            div.innerHTML =
              '<div style="background-color: white; padding: 8px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); margin: 10px; font-size: 13px;"><strong>Doble clic</strong> para marcar puntos</div>';
            setTimeout(() => {
              div.style.opacity = '0';
              setTimeout(() => {
                div.remove();
              }, 1000);
            }, 5000);
            this.tooltipAdded = true;
            return div;
          };
          tooltipControl.addTo(this.routeMap);
        }
      }
    }
  }

  private displayLoadedRouteOnMap(): void {
    if (this.calculatedPoints && this.calculatedPoints.length > 1) {
      // Limpiar ruta anterior
      if (this.routePolyline) {
        this.routeMap.removeLayer(this.routePolyline);
      }

      // Crear nueva polilínea
      this.routePolyline = L.polyline(this.calculatedPoints, {
        color: 'blue',
        weight: 4,
        opacity: 0.7,
      }).addTo(this.routeMap);

      // Establecer coordenadas de origen y destino
      this.origenCoords = this.calculatedPoints[0];
      this.destinoCoords =
        this.calculatedPoints[this.calculatedPoints.length - 1];

      // Crear marcadores
      this.createMarkersFromCoords();

      // Ajustar vista para mostrar toda la ruta
      this.preserveRouteView();

      console.log('Ruta cargada y mostrada en el mapa.');
    }
  }

  // Método auxiliar para crear marcadores desde coordenadas
  private createMarkersFromCoords(): void {
    if (this.origenCoords) {
      this.origenMarker = this.createMarker(this.origenCoords, 'origen');
    }

    if (this.destinoCoords) {
      this.destinoMarker = this.createMarker(this.destinoCoords, 'destino');
    }
  }

  private handleMarkerDragEnd(
    event: L.DragEndEvent,
    type: 'origen' | 'destino'
  ): void {
    const newCoords: L.LatLngTuple = [
      event.target.getLatLng().lat,
      event.target.getLatLng().lng,
    ];

    if (type === 'origen') {
      this.origenCoords = newCoords;
      // Actualizar el nombre de la ubicación
      this.getLocationName(newCoords).then((name) => {
        this.origenLocationName = name;
        this.changeDetectorRef.detectChanges();
      });
    } else {
      this.destinoCoords = newCoords;
      // Actualizar el nombre de la ubicación
      this.getLocationName(newCoords).then((name) => {
        this.destinoLocationName = name;
        this.changeDetectorRef.detectChanges();
      });
    }

    this.clearCalculatedRouteAndDistance(); // MODIFICADO: Limpiar ruta y distancia    // NUEVO: Si ambos puntos están definidos, calcular ruta automáticamente
    if (this.origenCoords && this.destinoCoords) {
      this.calculateRoute(false);
    }

    this.changeDetectorRef.detectChanges();
  }
  clearMapSelection(): void {
    // No permitir limpiar en modo vista
    if (this.isViewMode) return;

    this.clearCalculatedRouteAndDistance();
    if (this.origenMarker) {
      this.routeMap.removeLayer(this.origenMarker);
      this.origenMarker = null;
      this.origenCoords = null;
      this.origenLocationName = ''; // Limpiar nombre
    }
    if (this.destinoMarker) {
      this.routeMap.removeLayer(this.destinoMarker);
      this.destinoMarker = null;
      this.destinoCoords = null;
      this.destinoLocationName = ''; // Limpiar nombre
    }
    this.changeDetectorRef.detectChanges();
  }

  // MÉTODO RENOMBRADO Y MODIFICADO
  clearCalculatedRouteAndDistance(): void {
    if (this.routePolyline) {
      this.routeMap.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }
    this.calculatedPoints = null;
    this.routeCalculationError = null;
    this.calculatedDistance = null; // <--- AÑADIDO
    this.calculatedDuration = null; // <--- AÑADIDO
    // No forzamos detectChanges aquí, se hará al seleccionar puntos o calcular
    // o si se llama desde un método que sí lo hace (como clearMapSelection).
  }

  async loadRouteData() {
    if (!this.routeId) return;
    this.isLoading = true;
    const loading = await this.loadingCtrl.create({
      message: 'Cargando datos...',
    });
    await loading.present();

    this.apiService.getRoute(this.routeId).subscribe({
      next: (data: Route) => {
        loading.dismiss();
        this.isLoading = false;

        // Cargar datos del formulario
        this.routeForm.patchValue({
          nombre: data.nombreRuta,
          descripcion: data.descripcionRuta,
        });

        // Procesar puntos de la ruta
        this.processRoutePoints(data);
        this.cargarDistanciaGuardada(data);
        console.log('Datos de ruta cargados:', data);
        // Mapear duración y distancia guardadas si existen
        if (typeof data.duracionEstimada === 'number') {
          this.calculatedDuration = data.duracionEstimada;
        } else {
          this.calculatedDuration = null;
        }
      },
      error: async (err) => {
        loading.dismiss();
        this.isLoading = false;
        console.error('Error cargando datos de la ruta:', err);

        await this.handleError(
          'Error',
          'No se pudieron cargar los datos de la ruta.',
          true
        );
      },
    });
  } // Método consolidado para calcular ruta
  async calculateRoute(showLoading: boolean = true) {
    if (!this.origenCoords || !this.destinoCoords) {
      if (showLoading) {
        this.presentToast('Marca Origen y Destino en el mapa.', 'warning');
      }
      return;
    }

    this.isCalculatingRoute = true;
    this.routeCalculationError = null;
    this.calculatedDistance = null;
    this.calculatedDuration = null;

    let loading: HTMLIonLoadingElement | null = null;
    if (showLoading) {
      loading = await this.loadingCtrl.create({
        message: 'Calculando ruta...',
      });
      await loading.present();
    }

    this.apiService
      .getRoutePath(this.origenCoords!, this.destinoCoords!)
      .subscribe({
        next: async (osrmResponse: OsrmRouteData | null) => {
          if (loading) await loading.dismiss();
          this.isCalculatingRoute = false;

          if (
            osrmResponse &&
            osrmResponse.points &&
            osrmResponse.points.length > 1
          ) {
            this.calculatedPoints = osrmResponse.points;

            if (typeof osrmResponse.distance === 'number') {
              this.calculatedDistance = parseFloat(
                (osrmResponse.distance / 1000).toFixed(2)
              );
            }

            // Calcular tiempo estimado para camión de carga pesada
            if (
              typeof osrmResponse.duration === 'number' &&
              this.calculatedDistance
            ) {
              this.calculatedDuration = this.calculateTruckDuration(
                osrmResponse.duration,
                this.calculatedDistance
              );
            }

            if (this.routePolyline) {
              this.routeMap.removeLayer(this.routePolyline);
            }

            this.routePolyline = L.polyline(osrmResponse.points, {
              color: 'blue',
              weight: 4,
              opacity: 0.7,
            }).addTo(this.routeMap);

            // Preservar la vista apropiada
            this.preserveRouteView();

            this.presentToast(
              `Ruta calculada: ${
                this.calculatedDistance !== null
                  ? this.calculatedDistance + ' km'
                  : ''
              }${
                this.calculatedDuration !== null
                  ? ' - ' + this.formatDuration(this.calculatedDuration)
                  : ''
              }`,
              'success'
            );

            if (this.routeForm.valid && this.routeForm.value.nombre?.trim()) {
              this.presentToast(
                'Ruta lista para crear. Presiona "CREAR RUTA" para guardar.',
                'medium'
              );
            }
          } else {
            this.handleRouteCalculationError(
              'No se pudo calcular una ruta válida desde OSRM.'
            );
          }

          this.changeDetectorRef.detectChanges();
        },
        error: async (error) => {
          if (loading) await loading.dismiss();
          this.handleRouteCalculationError(
            'Error al conectar con servicio de rutas.'
          );
          console.error('Error cálculo OSRM:', error);
        },
      });
  }

  // Nuevo método para calcular duración específica para camiones de carga pesada
  private calculateTruckDuration(
    originalDuration: number,
    distanceKm: number
  ): number {
    // Factores de ajuste para camiones de carga pesada
    const TRUCK_SPEED_FACTOR = 0.7; // Camiones van 30% más lento que autos
    const URBAN_SPEED_FACTOR = 0.6; // En zonas urbanas van aún más lento
    const STOP_TIME_PER_KM = 30; // 30 segundos adicionales por km (semáforos, tráfico)
    const LOADING_UNLOADING_TIME = 600; // 10 minutos adicionales para carga/descarga

    // Duración base ajustada por velocidad de camión
    let adjustedDuration = originalDuration / TRUCK_SPEED_FACTOR;

    // Si la distancia es corta (< 10km), probablemente es zona urbana
    if (distanceKm < 10) {
      adjustedDuration = adjustedDuration / URBAN_SPEED_FACTOR;
    }

    // Agregar tiempo de paradas y maniobras
    const stopTime = distanceKm * STOP_TIME_PER_KM;

    // Tiempo total: duración ajustada + paradas + tiempo de carga/descarga
    const totalDurationSeconds =
      adjustedDuration + stopTime + LOADING_UNLOADING_TIME;

    // Convertir a minutos y redondear
    return Math.round(totalDurationSeconds / 60);
  } // Método público para formatear la duración en formato legible
  public formatDuration(durationMinutes: number): string {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Método público para formatear la duración en formato HH:MM
  public formatDurationAsTime(durationMinutes: number): string {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    // Formatear con ceros a la izquierda si es necesario
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');

    return `${hoursStr}:${minutesStr}`;
  }

  // Método público para formatear la duración en formato descriptivo
  public formatDurationDescriptive(durationMinutes: number): string {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours} horas con ${minutes} minutos`;
    } else if (hours > 0) {
      return `${hours} horas`;
    } else {
      return `${minutes} minutos`;
    }
  }

  // Método público para obtener velocidad estimada
  public getEstimatedSpeed(): string {
    if (this.calculatedDistance && this.calculatedDuration) {
      // Convertir minutos a horas para calcular km/h
      const speedKmh = this.calculatedDistance / (this.calculatedDuration / 60);
      return `${speedKmh.toFixed(1)} km/h`;
    }
    return 'N/A';
  }

  // Nuevo método: manejar errores de cálculo de ruta
  private handleRouteCalculationError(message: string): void {
    this.isCalculatingRoute = false;
    this.calculatedPoints = null;
    this.calculatedDistance = null;
    this.calculatedDuration = null;
    this.routeCalculationError = message;
    this.presentToast(this.routeCalculationError, 'danger');
    this.changeDetectorRef.detectChanges();
  }

  public formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${(distanceKm * 1000).toFixed(0)} metros`;
    } else {
      return `${distanceKm.toFixed(2)} km`;
    }
  }

  private cargarDistanciaGuardada(data: Route) {
    if (typeof data.kilometrosRuta === 'number') {
      this.calculatedDistance = data.kilometrosRuta;
    } else {
      this.calculatedDistance = null;
    }
  }

  // Nuevo método: procesar puntos de ruta al cargar datos
  private processRoutePoints(data: Route): void {
    let puntosDeserializados: any = data.puntosRuta;

    if (typeof data.puntosRuta === 'string') {
      try {
        puntosDeserializados = JSON.parse(data.puntosRuta);
      } catch (e) {
        console.error('Error parseando puntosRuta', e);
        puntosDeserializados = null;
      }
    }

    if (
      Array.isArray(puntosDeserializados) &&
      puntosDeserializados.length > 0
    ) {
      this.calculatedPoints = puntosDeserializados as L.LatLngTuple[];

      // Obtener nombres de ubicaciones
      this.loadLocationNames();
      // Cargar distancia si existe

      // Mostrar en mapa si está listo
      if (this.routeMap) {
        this.displayLoadedRouteOnMap();
        console.log(
          'Puntos de ruta cargados y mostrados en el mapa:',
          this.calculatedPoints
        );
      }
    } else {
      this.handleInvalidRoutePoints(puntosDeserializados);
      console.log('Puntos de ruta inválidos o vacíos:', puntosDeserializados);
    }

    this.changeDetectorRef.detectChanges();
  }

  // Nuevo método: cargar nombres de ubicaciones de origen y destino
  private loadLocationNames(): void {
    if (this.calculatedPoints && this.calculatedPoints.length > 1) {
      const origen = this.calculatedPoints[0];
      const destino = this.calculatedPoints[this.calculatedPoints.length - 1];

      Promise.all([this.getLocationName(origen), this.getLocationName(destino)])
        .then(([origenName, destinoName]) => {
          this.origenLocationName = origenName;
          this.destinoLocationName = destinoName;
          this.changeDetectorRef.detectChanges();
        })
        .catch((error) => {
          console.error('Error cargando nombres de ubicaciones:', error);
          // Fallback en caso de error
          this.origenLocationName = 'Ubicación de origen';
          this.destinoLocationName = 'Ubicación de destino';
          this.changeDetectorRef.detectChanges();
        });
    }
  }

  // Nuevo método: manejar puntos de ruta inválidos
  private handleInvalidRoutePoints(points: any): void {
    if (points && points.length === 0) {
      this.calculatedPoints = [];
    } else {
      console.error(
        'Los puntosRuta recibidos de la API no son un array válido:',
        points
      );
      this.presentToast(
        'Error: Los datos de puntos de la ruta guardada son inválidos.',
        'danger'
      );
      this.calculatedPoints = null;
    }
    this.calculatedDistance = null;
  }
  async saveRoute() {
    this.isSubmitted = true;
    this.routeForm.markAllAsTouched();

    // Validar campos obligatorios: nombre y puntos de ruta calculados
    if (
      this.routeForm.invalid ||
      !this.calculatedPoints ||
      this.calculatedPoints.length === 0
    ) {
      this.presentToast(
        'Hay campos incompletos o con errores. Por favor, revisa el formulario y define una ruta válida en el mapa.',
        'warning'
      );
      return; // Salimos del método sin mostrar modal de confirmación
    }

    // Añadir confirmación con alerta personalizada antes de guardar
    const confirmModal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: this.isEditMode ? 'Confirmar Edición' : 'Confirmar Creación',
        message: `¿Estás seguro de ${
          this.isEditMode ? 'actualizar' : 'crear'
        } la ruta <strong>"${this.routeForm.value.nombre}"</strong>?`,
        icon: this.isEditMode ? 'help' : 'info',
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'button-cancel' },
          {
            text: this.isEditMode ? 'Actualizar' : 'Crear',
            role: 'confirm',
            cssClass: 'confirm-button',
          },
        ],
      },
      backdropDismiss: false,
      cssClass: 'custom-alert-modal',
    });
    await confirmModal.present();

    const { data } = await confirmModal.onDidDismiss();
    if (data !== 'confirm') {
      return; // Cancelar si no se confirma
    }

    const loading = await this.loadingCtrl.create({
      message: this.isEditMode ? 'Actualizando...' : 'Creando...',
    });
    await loading.present();

    try {
      const puntosParaGuardar: Array<[number, number]> =
        this.calculatedPoints.map((p) => [p[0], p[1]]);
      const routeData: Partial<Route> = {
        nombreRuta: this.routeForm.value.nombre,
        descripcionRuta: this.routeForm.value.descripcion,
        puntosRuta: puntosParaGuardar,
        kilometrosRuta: this.calculatedDistance,
        duracionEstimada: this.calculatedDuration, // Guardar directamente como número (INT)
      };

      const saveObservable = this.isEditMode
        ? this.apiService.updateRoute(this.routeId!, routeData)
        : this.apiService.createRoute(routeData);

      saveObservable.subscribe({
        next: async (savedRoute) => {
          await loading.dismiss();
          await this.presentToast(
            `Ruta ${this.isEditMode ? 'actualizada' : 'creada'} exitosamente.`,
            'success'
          );
          if (this.modalCtrl) {
            this.modalCtrl.dismiss({ routeCreated: true }, 'success');
          } else {
            this.navCtrl.navigateBack('/rutas');
          }
        },
        error: async (error) => {
          await loading.dismiss();
          console.error('Error guardando ruta:', error);
          let detailMessage = 'Error desconocido.';
          if (error && error.message) {
            const match = error.message.match(/Detalle: (.*)/);
            detailMessage = match && match[1] ? match[1] : error.message;
          }

          // Usar alerta personalizada para el error
          const errorModal = await this.modalCtrl.create({
            component: AlertaPersonalizadaComponent,
            componentProps: {
              title: 'Error al Guardar',
              message: `No se pudo guardar la ruta. ${detailMessage}`,
              icon: 'error',
              buttons: [{ text: 'Aceptar', role: 'confirm' }],
            },
            cssClass: 'custom-alert-modal',
          });
          await errorModal.present();
        },
      });
    } catch (error) {
      await loading.dismiss();
      console.error('Error inesperado en saveRoute:', error);

      // Usar alerta personalizada para error inesperado
      const errorModal = await this.modalCtrl.create({
        component: AlertaPersonalizadaComponent,
        componentProps: {
          title: 'Error',
          message: 'Ocurrió un error inesperado al guardar.',
          icon: 'error',
          buttons: [{ text: 'Aceptar', role: 'confirm' }],
        },
        cssClass: 'custom-alert-modal',
      });
      await errorModal.present();
    }
  }

  async closeModal() {
    await this.modalCtrl.dismiss();
  }
  async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger' | 'medium' = 'medium'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color,
    });
    toast.present();
  }
  // Método simplificado para expandir/colapsar el mapa
  async expandMap(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (!this.routeMap) return;

    const mapContainer = this.routeMapRef.nativeElement;
    const modal = await this.modalCtrl.getTop();

    // Toggle estado de expansión
    this.isMapExpanded = !this.isMapExpanded;

    if (this.isMapExpanded) {
      // Expandir
      document.body.classList.add('body-map-expanded');
      mapContainer.classList.add('map-expanded');

      if (modal) modal.classList.add('routes-form-modal-expanded');

      // Configurar estilo para pantalla completa
      Object.assign(mapContainer.style, {
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: '0',
        left: '0',
        zIndex: '9999',
      });
    } else {
      // Contraer
      document.body.classList.remove('body-map-expanded');
      mapContainer.classList.remove('map-expanded');

      if (modal) modal.classList.remove('routes-form-modal-expanded');

      // Restaurar estilo original
      Object.assign(mapContainer.style, {
        height: '150px', // Altura original
        width: '100%',
        position: 'relative',
        top: '',
        left: '',
        zIndex: '',
      });
    }

    // Actualizar mapa después del cambio de tamaño
    setTimeout(() => {
      this.routeMap.invalidateSize();

      // Preservar la vista de la ruta según el estado
      this.preserveRouteView();

      this.updateMapClickListener();

      // Gestionar el event listener de Escape solo cuando está expandido
      if (this.isMapExpanded) {
        const escHandler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            this.expandMap();
            document.removeEventListener('keydown', escHandler);
          }
        };
        document.addEventListener('keydown', escHandler);
      }
    }, 150); // Aumentado el tiempo para mejor sincronización
  }

  // Nuevo método para preservar la vista de la ruta
  private preserveRouteView(): void {
    if (this.routePolyline && this.routeMap) {
      // Si hay una ruta dibujada, ajustar la vista para mostrarla completamente
      try {
        const bounds = this.routePolyline.getBounds();

        if (this.isMapExpanded) {
          // En vista expandida, usar más padding para mejor visualización
          this.routeMap.fitBounds(bounds, {
            padding: [50, 50], // Más padding en vista expandida
            maxZoom: 16, // Limitar el zoom máximo
          });
        } else {
          // En vista normal, usar menos padding pero asegurar que se vea toda la ruta
          this.routeMap.fitBounds(bounds, {
            padding: [20, 20], // Menos padding en vista normal
            maxZoom: 14, // Zoom un poco menor para vista compacta
          });
        }
      } catch (error) {
        console.warn('Error al ajustar bounds de la ruta:', error);
        // Fallback: centrar en las coordenadas de origen si existen
        if (this.origenCoords) {
          this.routeMap.setView(
            this.origenCoords,
            this.isMapExpanded ? 14 : 12
          );
        }
      }
    } else if (this.origenCoords || this.destinoCoords) {
      // Si no hay ruta pero hay marcadores, centrar en ellos
      const coordsToCenter = this.origenCoords || this.destinoCoords!;
      const zoomLevel = this.isMapExpanded ? 14 : 12;
      this.routeMap.setView(coordsToCenter, zoomLevel);
    } else {
      // Si no hay nada, volver a la vista por defecto de Concepción
      const concepcionCoords: L.LatLngTuple = [-36.7953, -73.0626];
      const zoomLevel = this.isMapExpanded ? 13 : 11;
      this.routeMap.setView(concepcionCoords, zoomLevel);
    }
  }
}
