// frontend/src/app/services/orden-trabajo-events.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface OtCreatedEvent {
  otsCreadas: any[];
  source: 'planificacion' | 'manual';
  planificacionNombre?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrdenTrabajoEventsService {
  private otCreatedSubject = new BehaviorSubject<OtCreatedEvent | null>(null);

  constructor() {}

  /**
   * Observable para escuchar eventos de OTs creadas
   */
  get otCreated$(): Observable<OtCreatedEvent | null> {
    return this.otCreatedSubject.asObservable();
  }

  /**
   * Notificar que se han creado nuevas OTs
   */
  notifyOtCreated(event: OtCreatedEvent): void {
    console.log('🔔 Notificando creación de OTs:', event);
    this.otCreatedSubject.next(event);
  }

  /**
   * Limpiar el último evento
   */
  clearLastEvent(): void {
    this.otCreatedSubject.next(null);
  }
}
