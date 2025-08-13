// src/app/services/socket.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root' // Servicio singleton
})
export class SocketService {
  private socket: Socket | undefined; // La instancia del socket cliente
  // URL del backend donde corre Socket.IO (asegúrate que coincida)
  private backendUrl = 'http://localhost:8101';

  constructor() {
    
  }

  // Método para establecer la conexión
  connect(): void {
    // Si ya existe un socket y está conectado, no hacer nada
    if (this.socket?.connected) {
      console.log('Socket.IO ya está conectado.');
      return;
    }

    console.log('Intentando conectar a Socket.IO en', this.backendUrl);
    // Crear la instancia del socket y conectar
    this.socket = io(this.backendUrl, {
      // Opciones de conexión (opcional)
      transports: ['websocket', 'polling'] // Intentar primero websocket, luego polling
    });

    // --- Manejadores de eventos del ciclo de vida del socket ---
    this.socket.on('connect', () => {
      console.log(`✅ Conectado a Socket.IO! ID: ${this.socket?.id}`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`🔌 Desconectado de Socket.IO. Razón: ${reason}`);
      // Podrías intentar reconectar aquí si es necesario para tu lógica
      if (reason === 'io server disconnect') {
        // El servidor forzó la desconexión, no intentar reconectar automáticamente
        this.socket?.connect();
      }
      // Para otras razones (ej. problema de red), el cliente intenta reconectar por defecto
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error.message, error);
    });

    // opcional añadir listeners para otros eventos estándar si los necesitas
    // this.socket.on('reconnect_attempt', () => { ... });
    // this.socket.on('reconnect', () => { ... });
  }

  // Método para desconectar manualmente
  disconnect(): void {
    if (this.socket) {
      console.log('Desconectando manualmente de Socket.IO...');
      this.socket.disconnect();
      this.socket = undefined; // Liberar la instancia
    }
  }

  
  listen<T = any>(eventName: string): Observable<T> {
    return new Observable<T>(observer => {
      // Si el socket no está conectado, intentar conectar
      if (!this.socket || !this.socket.connected) {
        console.warn(`Socket no conectado al intentar escuchar '${eventName}'. Intentando conectar...`);
        
        if (!this.socket) this.connect(); 
      }

      // Registrar el listener para el evento específico
      this.socket?.on(eventName, (data: T) => {
        // Cuando llega un mensaje, emitirlo a los suscriptores del Observable
        observer.next(data);
      });

      // --- Función de limpieza ---
      // Se ejecuta cuando el componente se des-suscribe del Observable
      return () => {
        console.log(`Dejando de escuchar el evento '${eventName}'`);
        this.socket?.off(eventName); // Importante: quitar el listener para evitar fugas de memoria
      };
    });
  }

  // Método para emitir (enviar) un evento AL SERVIDOR
  // (No lo usaremos mucho pero es útil tenerlo)
  emit(eventName: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn(`Socket no conectado. No se pudo emitir el evento '${eventName}'.`);
    }
  }

  // Método para verificar si el socket está conectado
  isConnected(): boolean {
      return this.socket?.connected ?? false;
  }
}