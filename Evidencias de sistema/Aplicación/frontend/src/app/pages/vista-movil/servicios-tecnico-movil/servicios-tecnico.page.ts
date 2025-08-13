import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ApiService, OrdenTrabajoResumen } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-servicios-tecnico',
  templateUrl: './servicios-tecnico.page.html',
  styleUrls: ['./servicios-tecnico.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class ServiciosTecnicoPage implements ViewWillEnter {
  ordenes: OrdenTrabajoResumen[] = [];
  isLoading = true;
  currentUser: any = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ionViewWillEnter() {
    // Verificar autenticación al entrar a la vista con debugging completo
    this.currentUser = this.debugUserInfo();

    if (!this.currentUser) {
      console.error('❌ Usuario no autenticado - no se cargarán órdenes');
      return;
    }

    // Corregir: usar id_usu en lugar de idUsu
    if (!this.currentUser.id_usu) {
      console.error('❌ Usuario sin ID válido:', this.currentUser);
      return;
    }

    if (this.currentUser.rol !== 'tecnico') {
      console.warn('⚠️ Usuario no es técnico:', {
        rol: this.currentUser.rol,
        esperado: 'tecnico',
      });
      // Aún así, podríamos permitir el acceso para testing
    }

    console.log('✅ Usuario válido, cargando órdenes...');
    this.cargarOrdenes();
  }

  cargarOrdenes(event?: any) {
    this.isLoading = true;

    // Usar el usuario ya cargado o obtenerlo nuevamente
    const usuario = this.currentUser || this.authService.getCurrentUser();

    console.log('👤 Usuario para cargar órdenes:', {
      usuario: usuario,
      id: usuario?.id_usu, // Corregir aquí también
      rol: usuario?.rol,
      nombre: usuario?.pri_nom_usu, // Y aquí
    });

    // Corregir: usar id_usu en lugar de idUsu
    if (!usuario || !usuario.id_usu) {
      console.error('❌ Usuario no encontrado o sin ID válido.');
      this.isLoading = false;
      if (event && event.target && event.target.complete) {
        event.target.complete();
      }
      return;
    }

    console.log(`🔍 Solicitando órdenes para técnico ID: ${usuario.id_usu}`);
    console.log(
      `🌐 Endpoint: /api/ordenes-trabajo-v2/tecnico/${usuario.id_usu}`
    );

    // Corregir: usar id_usu en lugar de idUsu
    this.apiService.getOrdenesParaTecnico(usuario.id_usu).subscribe({
      next: (data: OrdenTrabajoResumen[]) => {
        console.log('✅ Órdenes cargadas exitosamente:', data);
        this.ordenes = data;
        this.isLoading = false;
        if (event && event.target && event.target.complete) {
          event.target.complete();
        }
      },
      error: (err) => {
        this.handleLoadError(err);
        this.isLoading = false;
        if (event && event.target && event.target.complete) {
          event.target.complete();
        }
      },
    });
  }

  handleRefresh(event: any) {
    console.log('🔄 Refresh iniciado:', event);
    this.cargarOrdenes(event);
  }

  // Método para obtener el color del estado
  getEstadoColor(estado: string): string {
    console.log('Estado recibido:', estado); // Verifica el valor del estado
    switch (estado) {
      case 'sin_iniciar':
        return 'primary'; // Azul
      case 'en_progreso':
        return 'warning'; // Amarillo
      case 'completada':
        return 'success'; // Verde
      case 'rechazado':
        return 'danger'; // Rojo
      default:
        return 'medium'; // Gris
    }
  }

  // Método para formatear el texto del estado
  formatEstado(estado: string): string {
    if (!estado) return 'Desconocido';

    switch (estado) {
      case 'sin_iniciar':
        return 'Sin Iniciar';
      case 'en_progreso':
        return 'En Progreso';
      case 'completada':
        return 'Completada';
      case 'rechazado':
        return 'Deshabilitada';
      default:
        return estado
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }

  /**
   * Maneja errores de carga de órdenes y muestra mensajes apropiados
   */
  private handleLoadError(err: any) {
    console.error('❌ Error detallado al cargar órdenes:', {
      error: err,
      status: err.status,
      message: err.message,
      url: err.url,
    });

    let errorMessage = 'Error al cargar las órdenes de trabajo.';

    if (err.status === 403) {
      errorMessage =
        'No tienes permisos para ver las órdenes de trabajo. Verifica tu rol de usuario.';
    } else if (err.status === 401) {
      errorMessage =
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    } else if (err.status === 0) {
      errorMessage =
        'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
    }

    // Aquí podrías mostrar un toast o modal con el error
    console.error('💬 Mensaje para usuario:', errorMessage);
  }

  /**
   * Método de debugging para verificar el estado del usuario
   */
  debugUserInfo() {
    const user = this.authService.getCurrentUser();
    const token = localStorage.getItem('authToken');
    const userStorage = localStorage.getItem('currentUser');

    console.log('🔍 DEBUG - Estado completo del usuario:', {
      currentUser: user,
      hasToken: !!token,
      tokenLength: token?.length,
      userInStorage: userStorage,
      parsedUser: userStorage ? JSON.parse(userStorage) : null,
      // Agregar verificación específica de propiedades
      idUsu: user?.idUsu, // Para ver la diferencia
      priNomUsu: user?.priNomUsu, // Para comparar
      rol: user?.rol,
    });

    return user;
  }
}
