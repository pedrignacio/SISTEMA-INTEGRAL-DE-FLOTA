// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import * as L from 'leaflet';

// Interfaz para la respuesta de OSRM (como definimos antes)
export interface OsrmRouteData {
  points: L.LatLngTuple[];
  distance: number;
  duration: number;
}
export interface UsuarioSiniestro {
  id_usu: number;
  pri_nom_usu: string;
  pri_ape_usu: string;
}
export interface VehiculoSiniestro {
  id_vehi: number;
  patente: string;
  marca: string;
  modelo: string;
}
export interface HistorialItem {
  tipo: 'Mantenimiento' | 'Siniestro' | 'Combustible';
  fecha: string;
  titulo: string;
  subtitulo: string;
  costo: number | null;
  id: number;
  icon: string;
  color: string;
  descripcion?: string;
  archivoUrl?: string;
  urlComprobante?: string;
  encargado?: string;
  solicitante?: string;
}
export interface Siniestro {
  id: number;
  fecha: string;
  descripcion: string | null;
  tipo: string;
  estado: string;
  archivoUrl?: string;
  costoEstimado?: number;
  conductor?: UsuarioSiniestro;
  vehiculo?: VehiculoSiniestro;
}
export interface Usuario {
  id_usu: number;
  pri_nom_usu: string;
  seg_nom_usu?: string;
  pri_ape_usu: string;
  seg_ape_usu?: string;
  email: string;
  rol: 'admin' | 'conductor' | 'gestor' | 'mantenimiento' | 'tecnico';
  rut_usu?: string;
  celular?: string;
  estado_usu?: 'activo' | 'inactivo' | 'licencia';
  fec_cre_usu: string;
  // AÑADIDO: Propiedades de la licencia para que coincidan con el backend
  fec_emi_lic?: string | null;
  fec_ven_lic?: string | null;
  tipo_lic?: string | null;
  archivo_url_lic?: string | null;
}
// Interfaz para RUTA (plantilla)
export interface Route {
  idRuta: number;
  nombreRuta: string;
  descripcionRuta: string | null;
  puntosRuta: Array<[number, number]>;
  kilometrosRuta?: number | null;
  duracionEstimada?: number | null; // Duración en minutos como INT
}

// Interfaz para VEHICULO (simplificada para el contexto de asignación)
export interface VehiculoAsignacionInfo {
  idVehi: number;
  patente: string;
  modelo?: string;
  marca?: string;
  estadoVehi?: string;
}

// Interfaz para USUARIO (conductor, simplificada)
export interface UsuarioConductorInfo {
  idUsu: number;
  id_usu: number;
  priNomUsu: string;
  pri_nom_usu: string;
  pri_ape_usu: string;
  priApeUsu: string;
  email?: string;
}
export interface TareaPlanificacionData {
  nomTareaPlan: string;
  descTareaPlan?: string | null;
}

export interface PlanificacionMantenimientoData {
  descPlan: string;
  frecuencia: number;
  tipoFrecuencia: 'km' | 'dias' | 'semanas' | 'meses';
  esActivoPlan: boolean;
  fechaActivacion?: string | null;
  esPreventivo: boolean;
  tareas: TareaPlanificacionData[];
  vehiculosIds: number[];
}

export interface TareaPlanificacionResumen extends TareaPlanificacionData {
  idTareaPlan: number;
  planificacionMantenimientoIdPlan: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PlanificacionMantenimientoResumen {
  idPlan: number;
  descPlan: string;
  frecuencia: number;
  tipoFrecuencia: string;
  fechaActivacion?: string | null;
  esActivoPlan: boolean;
  esPreventivo: boolean;
  fecCrePlan?: string;
  fecActPlan?: string;
  createdAt?: string;
  tareas?: TareaPlanificacionResumen[];
  vehiculosEnPlan?: VehiculoAsignacionInfo[];
}
export interface AsignacionRecorrido {
  idAsig: number;
  estadoAsig:
    | 'pendiente'
    | 'asignado'
    | 'en_progreso'
    | 'completado'
    | 'cancelado';
  fecCreAsig: string;
  fecIniRecor: string;
  fecFinRecor?: string | null;
  efiCombRecor?: number | null;
  kmIniRecor: number;
  kmFinRecor?: number | null;
  notas?: string | null;
  vehiculoIdVehi: number;
  usuarioIdUsu: number;
  rutaIdRuta: number;

  vehiculo?: VehiculoAsignacionInfo;
  conductor?: UsuarioConductorInfo;
  rutaPlantilla?: Route;
}

export interface UsuarioResumen {
  id_usu: number;
  pri_nom_usu: string;
  pri_ape_usu: string;
}

export interface VehiculoResumen {
  id_vehi?: number; // Agregar ID del vehículo
  patente: string;
  marca: string;
  modelo: string;
}

// --- Interfaces para Órdenes de Trabajo ---

export interface DetalleOtData {
  id_det: number;
  desc_det: string;
  checklist: boolean;
  es_activo_det: boolean;
  estado: 'solicitado' | 'en_progreso' | 'completado' | 'cancelado'; // Agregar esta propiedad
  tecnico?: UsuarioResumen;
  fec_ini_det?: string | null; // Fecha de inicio de la tarea
  fec_fin_det?: string | null; // Fecha de finalización de la tarea
  duracion_real_det?: number | null; // Duración real en minutos
}

// Tipos para los estados de las órdenes de trabajo (sincronizado con backend)
export type EstadoOrdenTrabajo =
  | 'sin_iniciar'
  | 'iniciada'
  | 'en_progreso'
  | 'cancelada'
  | 'completada'
  | 'rechazado';

export type PrioridadOrdenTrabajo = 'baja' | 'media' | 'alta' | 'urgente';

export interface OrdenTrabajoResumen {
  id_ot: number;
  fec_ini_ot: string;
  estado_ot: EstadoOrdenTrabajo;
  prioridad: PrioridadOrdenTrabajo;
  km_ot: number;
  descripcion_ot: string;
  vehiculo_id_vehi?: number; // ID del vehículo para operaciones
  vehiculo?: VehiculoResumen; // Hacer opcional ya que puede venir undefined del backend
  solicitante?: UsuarioResumen;
  fec_fin_ot?: string;
}

export interface OrdenTrabajoDetalle extends OrdenTrabajoResumen {
  fec_fin_ot?: string;
  encargado?: UsuarioResumen;
  detalles: DetalleOtData[];
}
export interface AsignacionRecorridoData {
  fecIniRecor: string;
  fecFinRecor?: string | null;
  kmIniRecor?: number;
  kmFinRecor?: number | null;
  notas?: string | null;
  vehiculoIdVehi: number;
  usuarioIdUsu: number;
  rutaIdRuta: number;
  estadoAsig?:
    | 'pendiente'
    | 'asignado'
    | 'en_progreso'
    | 'completado'
    | 'cancelado';
  efiCombRecor?: number | null;
}

export type EstadoVehiculo =
  | 'activo'
  | 'inactivo'
  | 'mantenimiento'
  | 'taller'
  | 'baja';
export type TipoCombustibleVehiculo =
  | 'gasolina_93'
  | 'gasolina_95'
  | 'gasolina_97'
  | 'diesel'
  | 'electrico'
  | 'otro';

export interface Vehiculo {
  idVehi?: number;
  patente: string;
  chasis: string;
  tipoVehi?: string | null;
  estadoVehi: EstadoVehiculo;
  tipoCombVehi?: TipoCombustibleVehiculo | null;
  kmVehi: number;
  marca: string;
  modelo: string;
  anio: number;
  kmVidaUtil?: number | null;
  efiComb?: number | null;
  fecAdqui: string;
  latitud?: number | null;
  longitud?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://localhost:8101/api';

  constructor(private http: HttpClient) {}

  // --- Métodos para Rutas (plantillas) ---
  getRoutePath(
    start: L.LatLngTuple,
    end: L.LatLngTuple
  ): Observable<OsrmRouteData | null> {
    const lonLatStart = `${start[1]},${start[0]}`;
    const lonLatEnd = `${end[1]},${end[0]}`;
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lonLatStart};${lonLatEnd}?overview=full&geometries=geojson`;
    return this.http.get<any>(osrmUrl).pipe(
      map((response) => {
        if (
          response?.routes?.[0]?.geometry?.coordinates &&
          typeof response.routes[0].distance === 'number' &&
          typeof response.routes[0].duration === 'number'
        ) {
          const routeLeg = response.routes[0];
          const coordinates = routeLeg.geometry.coordinates;
          const distanceInMeters = routeLeg.distance;
          const durationInSeconds = routeLeg.duration;
          const latLngPoints: L.LatLngTuple[] = coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]]
          );
          return {
            points: latLngPoints,
            distance: distanceInMeters,
            duration: durationInSeconds,
          };
        }
        return null;
      }),
      catchError(this.handleErrorSimple)
    );
  }
  crearPlanificacion(data: PlanificacionMantenimientoData): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/planificaciones-v2`, data)
      .pipe(catchError(this.handleError));
  }

  /**
   * Crear planificación con generación automática de OTs (nuevo endpoint refactorizado)
   */
  crearPlanificacionConOts(
    data: PlanificacionMantenimientoData & { idUsuarioSolicitante?: number }
  ): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/planificaciones-v2`, data)
      .pipe(catchError(this.handleError));
  }
  getCostosCombustibleMes(): Observable<{ total: number }> {
    // Puedes pasar un parámetro de timeframe si tu backend lo soporta, ej: ?timeframe=last30days
    return this.http
      .get<{ total: number }>(`${this.apiUrl}/stats/costo-combustible-mes`)
      .pipe(catchError(this.handleError));
  }
  getVehiculoAsignacionesActivas(
    id: number
  ): Observable<AsignacionRecorrido[]> {
    return this.http
      .get<AsignacionRecorrido[]>(`${this.apiUrl}/vehicles/${id}/asignaciones`)
      .pipe(catchError(this.handleError));
  }
  /**
   * Obtiene el costo total de mantenimiento del último mes.
   * Asume que el backend devuelve { total: number }.
   */
  getCostosMantenimientoMes(): Observable<{ total: number }> {
    // Puedes pasar un parámetro de timeframe si tu backend lo soporta
    return this.http
      .get<{ total: number }>(`${this.apiUrl}/stats/costo-mantenimiento-mes`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtiene la eficiencia promedio de combustible de la flota.
   * Asume que el backend devuelve { promedio: number }.
   */
  getEficienciaCombustiblePromedio(): Observable<{ promedio: number }> {
    return this.http
      .get<{ promedio: number }>(
        `${this.apiUrl}/stats/eficiencia-combustible-promedio`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtiene la cantidad de alertas de mantenimiento pendientes o críticas.
   * Asume que el backend devuelve { cantidad: number }.
   */
  getAlertasMantenimientoPendiente(): Observable<{ cantidad: number }> {
    return this.http
      .get<{ cantidad: number }>(
        `${this.apiUrl}/stats/alertas-mantenimiento-pendiente`
      )
      .pipe(catchError(this.handleError));
  }
  checkPlanDescriptionExists(
    descPlan: string,
    excludeId?: number
  ): Observable<{ exists: boolean }> {
    let params = new HttpParams().set('descPlan', descPlan);
    if (excludeId) {
      params = params.set('excludeId', excludeId.toString());
    }
    // Asegúrate de que la ruta coincida con la de tu backend
    return this.http.get<{ exists: boolean }>(
      `${this.apiUrl}/planificaciones-v2/check-description`,
      { params }
    );
  }
  /**
   * Obtiene la cantidad de alertas de siniestros pendientes o sin resolver.
   * Asume que el backend devuelve { cantidad: number }.
   */
  getAlertasSiniestrosPendientes(): Observable<{ cantidad: number }> {
    return this.http
      .get<{ cantidad: number }>(
        `${this.apiUrl}/stats/alertas-siniestros-pendientes`
      )
      .pipe(catchError(this.handleError));
  }
  deleteUser(id_usu: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.apiUrl}/usuarios/${id_usu}`)
      .pipe(catchError(this.handleError));
  }
  checkRutExists(
    rut: string,
    userId?: number
  ): Observable<{ exists: boolean }> {
    let params = new HttpParams().set('rut', rut);
    if (userId) {
      params = params.set('id', userId.toString()); // Pasa el ID del usuario actual para excluirlo en ediciones
    }
    return this.http
      .get<{ exists: boolean }>(`${this.apiUrl}/usuarios/check-rut`, { params })
      .pipe(
        catchError(this.handleError) // Puedes usar handleError o un handleError más simple si no quieres tostar errores aquí
      );
  }
  createUser(data: Partial<Usuario> & { clave: string }): Observable<Usuario> {
    return this.http
      .post<Usuario>(`${this.apiUrl}/usuarios`, data)
      .pipe(catchError(this.handleError));
  }
  getHistorialVehiculo(
    id: number
  ): Observable<{ kpis: any; historial: HistorialItem[] }> {
    return this.http
      .get<{ kpis: any; historial: HistorialItem[] }>(
        `${this.apiUrl}/vehiculos/${id}/historial`
      )
      .pipe(catchError(this.handleError));
  }

  getDashboardKpis(): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/stats/dashboard-kpis`)
      .pipe(catchError(this.handleError));
  }
  getMantenimientoReport(filtros: any): Observable<any[]> {
    let params = new HttpParams();
    if (filtros.fechaDesde)
      params = params.append('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta)
      params = params.append('fechaHasta', filtros.fechaHasta);
    if (filtros.vehiculoId)
      params = params.append('vehiculoId', filtros.vehiculoId);

    return this.http.get<any[]>(
      `${this.apiUrl}/ordenes-trabajo/reporte/mantenimientos`,
      { params }
    );
  }
  getCombustibleById(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/combustibles/${id}`)
      .pipe(catchError(this.handleError));
  }
  getPlanificaciones(): Observable<PlanificacionMantenimientoResumen[]> {
    return this.http
      .get<ApiResponse<PlanificacionMantenimientoResumen[]>>(
        `${this.apiUrl}/planificaciones-v2`
      )
      .pipe(
        map((response) => response.data), // Extraer el array de la propiedad 'data'
        catchError(this.handleError)
      );
  }
  getAllUsers(rol?: string, estado: string = 'activo'): Observable<Usuario[]> {
    let params = new HttpParams();
    if (rol) {
      params = params.append('rol', rol);
    }
    // Siempre se enviará el estado, por defecto 'activo'
    params = params.append('estado', estado);

    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios`, { params });
  }
  reactivateUser(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/usuarios/reactivate/${id}`, {});
  }
  checkVehicleAvailability(
    vehiculoId: number,
    fechaDesde: string,
    fechaHasta: string,
    asignacionIdActual: number | null = null
  ): Observable<{ disponible: boolean; mensaje: string }> {
    let params = new HttpParams()
      .set('vehiculoId', vehiculoId.toString())
      .set('fechaDesde', fechaDesde)
      .set('fechaHasta', fechaHasta);

    if (asignacionIdActual) {
      params = params.set('asignacionActualId', asignacionIdActual.toString());
    }

    // Asegúrate de que la URL base coincida con la de tus otras llamadas
    const url = `${this.apiUrl}/asignaciones-recorrido/check-disponibilidad`;
    return this.http.get<{ disponible: boolean; mensaje: string }>(url, {
      params,
    });
  }
  getVehiculos(): Observable<Vehiculo[]> {
    return this.http.get<Vehiculo[]>(this.apiUrl);
  }
  updateUser(id_usu: number, data: Partial<Usuario>): Observable<Usuario> {
    return this.http
      .put<Usuario>(`${this.apiUrl}/usuarios/${id_usu}`, data)
      .pipe(catchError(this.handleError));
  }
  getSiniestros(params?: { timeframe?: string }): Observable<Siniestro[]> {
    let httpParams = new HttpParams();
    if (params?.timeframe) {
      httpParams = httpParams.set('timeframe', params.timeframe);
    }
    return this.http
      .get<Siniestro[]>(`${this.apiUrl}/siniestros`, { params: httpParams }) // Asegúrate de que el backend pueda filtrar por timeframe
      .pipe(catchError(this.handleError));
  }
  getSiniestroById(id: number): Observable<Siniestro> {
    return this.http
      .get<Siniestro>(`${this.apiUrl}/siniestros/${id}`)
      .pipe(catchError(this.handleError));
  }
  checkEmailExists(
    email: string,
    userId?: number
  ): Observable<{ exists: boolean }> {
    let params = new HttpParams().set('email', email);
    if (userId) {
      params = params.set('id', userId.toString()); // Pasa el ID del usuario actual para excluirlo
    }
    return this.http
      .get<{ exists: boolean }>(`${this.apiUrl}/usuarios/check-email`, {
        params,
      })
      .pipe(
        catchError(this.handleError) // Puedes usar handleError o un catchError más específico si lo prefieres
      );
  }
  updateSiniestroStatus(id: number, estado: string): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/siniestros/${id}/estado`, { estado: estado })
      .pipe(catchError(this.handleError));
  }
  updateSiniestro(id: number, data: Partial<Siniestro>): Observable<Siniestro> {
    return this.http
      .put<Siniestro>(`${this.apiUrl}/siniestros/${id}`, data)
      .pipe(catchError(this.handleError));
  }

  getOrdenesParaTecnico(tecnicoId: number): Observable<OrdenTrabajoResumen[]> {
    return this.http.get<OrdenTrabajoResumen[]>(
      `${this.apiUrl}/ordenes-trabajo-v2/tecnico/${tecnicoId}`
    );
  }
  getHistorialCombustible(conductorId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/combustibles/historial/conductor/${conductorId}`
    );
  }
  getStatsVehiculosPorTipo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/vehiculos-por-tipo`);
  }
  getStatsMantenimientosPorEstado(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/mantenimientos-por-estado`);
  }
  registrarIncidente(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/siniestros`, data);
  }
  // Método para registrar la carga de combustible
  registrarCargaCombustible(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/combustibles`, data);
  }

  getVehiculoActivo(conductorId: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/asignaciones-recorrido/vehiculo-activo/conductor/${conductorId}`
    );
  }
  generarOtsParaPlan(
    idPlan: number,
    vehiculosIds: number[],
    idUsuario: number
  ): Observable<{ message: string }> {
    const body = {
      id_plan: idPlan,
      vehiculos_ids: vehiculosIds, // Enviamos el array completo
      id_usuario_solicitante: idUsuario,
    };
    console.log('[ApiService] Cuerpo para generar OTs en masa:', body);

    // Llamamos a un nuevo endpoint que crearemos en el backend
    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/ordenes-trabajo/generar-bulk`, // Nuevo endpoint
        body
      )
      .pipe(catchError(this.handleError));
  }

  // --- Métodos para el Módulo de Órdenes de Trabajo ---
  /**
   * Actualiza el estado de una orden de trabajo
   * @param id - ID de la orden de trabajo
   * @param estado - Nuevo estado (debe ser uno de los valores válidos del enum)
   * @param encargadoId - ID opcional del usuario encargado
   */
  actualizarEstadoOt(
    id: number,
    estado: EstadoOrdenTrabajo,
    encargadoId?: number
  ): Observable<any> {
    const body: {
      estado_ot: EstadoOrdenTrabajo;
      usuario_id_usu_encargado?: number;
    } = {
      estado_ot: estado,
    };
    if (encargadoId) {
      body.usuario_id_usu_encargado = encargadoId;
    }
    return this.http.put(`${this.apiUrl}/ordenes-trabajo/${id}/estado`, body);
  }

  /**
   * Rechaza una orden de trabajo con motivo
   * @param id - ID de la orden de trabajo
   * @param motivoRechazo - Motivo del rechazo
   * @param usuarioId - ID del usuario que rechaza
   */
  rechazarOrdenTrabajo(
    id: number,
    motivoRechazo: string,
    usuarioId: number
  ): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/ordenes-trabajo/${id}/rechazar`, {
        motivo_rechazo: motivoRechazo,
        usuario_id: usuarioId,
      })
      .pipe(catchError(this.handleError));
  }

  generarOt(
    idPlan: number,
    idVehi: number,
    idUsuario: number
  ): Observable<{ message: string; id_ot: number }> {
    const body = {
      id_plan: idPlan,
      id_vehi: idVehi,
      id_usuario_solicitante: idUsuario,
    };

    // --- LOG 2: VERIFICAR EL CUERPO DE LA PETICIÓN HTTP ---
    console.log(
      '[LOG 2 - ApiService] Cuerpo (body) de la petición POST:',
      body
    );
    // ----------------------------------------------------

    return this.http.post<{ message: string; id_ot: number }>(
      `${this.apiUrl}/ordenes-trabajo/generar`,
      body
    );
  }

  getOrdenesTrabajo(): Observable<OrdenTrabajoResumen[]> {
    return this.http.get<OrdenTrabajoResumen[]>(
      `${this.apiUrl}/ordenes-trabajo-v2`
    );
  }

  actualizarDetallesOt(idOt: number, payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/ordenes-trabajo-v2/${idOt}/detalles`,
      payload
    );
  }

  getOrdenTrabajoById(id: number): Observable<OrdenTrabajoDetalle> {
    return this.http.get<OrdenTrabajoDetalle>(
      `${this.apiUrl}/ordenes-trabajo-v2/${id}`
    );
  }

  getUsuariosPorRol(rol: string): Observable<UsuarioResumen[]> {
    return this.http.get<UsuarioResumen[]>(`${this.apiUrl}/usuarios`, {
      params: { rol },
    });
  }

  asignarTecnico(
    idDetalle: number,
    idTecnico: number
  ): Observable<{ message: string }> {
    const body = {
      id_detalle: idDetalle,
      id_tecnico: idTecnico,
    };
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/ordenes-trabajo/asignar-tecnico`,
      body
    );
  }

  getPlanificacionById(
    id: number
  ): Observable<PlanificacionMantenimientoResumen> {
    return this.http
      .get<ApiResponse<PlanificacionMantenimientoResumen>>(
        `${this.apiUrl}/planificaciones-v2/${id}`
      )
      .pipe(
        map((response) => response.data), // Extraer el objeto de la propiedad 'data'
        catchError(this.handleError)
      );
  }

  updatePlanificacion(
    id: number,
    data: Partial<PlanificacionMantenimientoData>
  ): Observable<any> {
    return this.http
      .put<any>(`${this.apiUrl}/planificaciones-v2/${id}`, data)
      .pipe(catchError(this.handleError));
  }

  // Nuevo método para actualizar planificación y generar OTs para nuevos vehículos
  updatePlanificacionConOts(
    id: number,
    data: Partial<PlanificacionMantenimientoData>,
    nuevosVehiculosIds: number[],
    idUsuario: number
  ): Observable<any> {
    // Primero actualizamos la planificación
    return this.updatePlanificacion(id, data).pipe(
      switchMap((response) => {
        // Si no hay nuevos vehículos, retornamos la respuesta original
        if (!nuevosVehiculosIds || nuevosVehiculosIds.length === 0) {
          return of(response);
        }

        // Si hay nuevos vehículos, generamos OTs para ellos
        return this.generarOtsParaPlan(id, nuevosVehiculosIds, idUsuario).pipe(
          map((otsResponse) => {
            // Combinamos las respuestas
            return {
              ...response,
              otsGeneradas: true,
              otsMessage: otsResponse.message,
              nuevosVehiculosIds,
            };
          })
        );
      }),
      catchError(this.handleError)
    );
  }

  deletePlanificacion(id: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.apiUrl}/planificaciones-v2/${id}`)
      .pipe(catchError(this.handleError));
  }

  getRoutes(): Observable<Route[]> {
    return this.http
      .get<Route[]>(`${this.apiUrl}/rutas`)
      .pipe(catchError(this.handleError));
  }

  getRoute(id: number): Observable<Route> {
    return this.http
      .get<Route>(`${this.apiUrl}/rutas/${id}`)
      .pipe(catchError(this.handleError));
  }

  createRoute(routeData: Partial<Route>): Observable<Route> {
    return this.http
      .post<Route>(`${this.apiUrl}/rutas`, routeData)
      .pipe(catchError(this.handleError));
  }

  updateRoute(id: number, routeData: Partial<Route>): Observable<Route> {
    return this.http
      .put<Route>(`${this.apiUrl}/rutas/${id}`, routeData)
      .pipe(catchError(this.handleError));
  }

  deleteRoute(id: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.apiUrl}/rutas/${id}`)
      .pipe(catchError(this.handleError));
  }

  // MODIFICADO: getVehicles ahora acepta un array de EstadoVehiculo para 'estado'
  getVehicles(params?: {
    estado?: EstadoVehiculo | EstadoVehiculo[]; // <<-- CAMBIO AQUÍ: Añade | EstadoVehiculo[]
    tipo?: string;
  }): Observable<Vehiculo[]> {
    let httpParams = new HttpParams();
    if (params?.estado) {
      if (Array.isArray(params.estado)) {
        params.estado.forEach((s) => {
          httpParams = httpParams.append('estado[]', s); // Envía como estado[]=mantenimiento&estado[]=taller
        });
      } else {
        httpParams = httpParams.set('estado', params.estado);
      }
    }
    if (params?.tipo) {
      httpParams = httpParams.set('tipo', params.tipo);
    }
    return this.http
      .get<Vehiculo[]>(`${this.apiUrl}/vehicles`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getVehicle(id: number): Observable<Vehiculo> {
    return this.http
      .get<Vehiculo>(`${this.apiUrl}/vehiculos/${id}`)
      .pipe(catchError(this.handleError));
  }
  getVehiculosDisponibles(): Observable<VehiculoAsignacionInfo[]> {
    return this.http
      .get<VehiculoAsignacionInfo[]>(`${this.apiUrl}/vehicles`)
      .pipe(catchError(this.handleError));
  }
  createVehicle(vehicleData: Vehiculo): Observable<Vehiculo> {
    return this.http
      .post<Vehiculo>(`${this.apiUrl}/vehicles`, vehicleData)
      .pipe(catchError(this.handleError));
  }

  updateVehicle(
    id: number,
    vehicleData: Partial<Vehiculo>
  ): Observable<Vehiculo> {
    return this.http
      .put<Vehiculo>(`${this.apiUrl}/vehicles/${id}`, vehicleData)
      .pipe(catchError(this.handleError));
  }

  deleteVehicle(id: number): Observable<{ message: string; warnings?: string[] }> {
    return this.http
      .put<{ message: string; warnings?: string[] }>(`${this.apiUrl}/vehicles/${id}/deactivate`, {})
      .pipe(catchError(this.handleError));
  }

  getAsignacionesRecorrido(filtros?: any): Observable<AsignacionRecorrido[]> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach((key) => {
        if (filtros[key] !== null && filtros[key] !== undefined) {
          params = params.set(key, filtros[key]);
        }
      });
    }
    return this.http
      .get<AsignacionRecorrido[]>(`${this.apiUrl}/asignaciones-recorrido`, {
        params,
      })
      .pipe(catchError(this.handleError));
  }

  getAsignacionRecorrido(idAsig: number): Observable<AsignacionRecorrido> {
    return this.http
      .get<AsignacionRecorrido>(
        `${this.apiUrl}/asignaciones-recorrido/${idAsig}`
      )
      .pipe(catchError(this.handleError));
  }

  createAsignacionRecorrido(
    data: AsignacionRecorridoData
  ): Observable<AsignacionRecorrido> {
    return this.http
      .post<AsignacionRecorrido>(`${this.apiUrl}/asignaciones-recorrido`, data)
      .pipe(catchError(this.handleError));
  }

  updateAsignacionRecorrido(
    idAsig: number,
    data: Partial<AsignacionRecorridoData>
  ): Observable<AsignacionRecorrido> {
    return this.http
      .put<AsignacionRecorrido>(
        `${this.apiUrl}/asignaciones-recorrido/${idAsig}`,
        data
      )
      .pipe(catchError(this.handleError));
  }

  deleteAsignacionRecorrido(idAsig: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(
        `${this.apiUrl}/asignaciones-recorrido/${idAsig}`
      )
      .pipe(catchError(this.handleError));
  }

  getUsuarios(params?: { rol?: string }): Observable<UsuarioConductorInfo[]> {
    let httpParams = new HttpParams();
    if (params?.rol) {
      httpParams = httpParams.set('rol', params.rol);
    }
    console.log('getUsuarios', params, httpParams);

    return this.http
      .get<UsuarioConductorInfo[]>(`${this.apiUrl}/auth/users`, {
        params: httpParams,
      })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido.';
    let userFriendlyMessage =
      'No se pudo completar la operación. Inténtalo de nuevo.';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente o de red: ${error.error.message}`;
      userFriendlyMessage =
        'Error de red o del navegador. Por favor, revisa tu conexión.';
    } else {
      errorMessage = `Error del Servidor Código: ${error.status}\nMensaje: ${error.message}`;
      if (
        error.error &&
        typeof error.error === 'object' &&
        error.error.message
      ) {
        errorMessage += `\nDetalle Backend: ${error.error.message}`;
        userFriendlyMessage = error.error.message;
      } else if (
        error.error &&
        typeof error.error === 'string' &&
        error.error.length < 200
      ) {
        errorMessage += `\nDetalle Backend: ${error.error}`;
        userFriendlyMessage = error.error;
      } else if (error.status === 400) {
        userFriendlyMessage =
          'Solicitud incorrecta. Revisa los datos enviados.';
      } else if (error.status === 401) {
        userFriendlyMessage =
          'No autorizado. Por favor, inicia sesión de nuevo.';
      } else if (error.status === 403) {
        userFriendlyMessage =
          'Acceso prohibido. No tienes permisos para esta acción.';
      } else if (error.status === 404) {
        userFriendlyMessage =
          'El recurso solicitado no fue encontrado en el servidor.';
      } else if (error.status === 500) {
        userFriendlyMessage =
          'Error interno del servidor. Inténtalo más tarde.';
      }
    }
    console.error('Error en ApiService:', errorMessage, error);
    return throwError(() => ({
      message: userFriendlyMessage,
      status: error.status,
      errorContent: error.error,
    }));
  }

  private handleErrorSimple(error: HttpErrorResponse) {
    console.error('Error en servicio externo:', error.message || error);
    return of(null);
  }
}
