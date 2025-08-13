import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';

// Interfaz para definir la estructura de nuestros grupos
interface HistorialGroup {
  fecha: string;
  registros: any[];
}

@Component({
  selector: 'app-historial-combustible',
  templateUrl: './historial-combustible.page.html',
  styleUrls: ['./historial-combustible.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class HistorialCombustiblePage implements ViewWillEnter {
  // Usaremos un nuevo array para los datos agrupados
  historialAgrupado: HistorialGroup[] = [];
  isLoading = true;

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ionViewWillEnter() {
    this.cargarHistorial();
  }

  cargarHistorial(event?: any) {
    this.isLoading = true;
    const usuario = this.authService.getCurrentUser();

    if (!usuario) {
      console.error('No hay usuario autenticado');
      this.isLoading = false;
      event?.target.complete();
      return;
    }

    // Usar cualquiera de los dos formatos disponibles
    const usuarioId = usuario.id_usu || usuario.idUsu;

    if (!usuarioId) {
      console.error('No se pudo determinar el ID del usuario', usuario);
      this.isLoading = false;
      event?.target.complete();
      return;
    }

    console.log('Cargando historial para usuario ID:', usuarioId);

    this.apiService.getHistorialCombustible(usuarioId).subscribe({
      next: (data) => {
        // Llamamos a la función para agrupar los datos
        this.historialAgrupado = this.agruparPorFecha(data);
        this.isLoading = false;
        event?.target.complete(); // Finaliza la animación del refresher
      },
      error: (err) => {
        console.error('Error al cargar historial', err);
        this.isLoading = false;
        event?.target.complete();
      },
    });
  }

  // Nueva función para agrupar el historial por día
  private agruparPorFecha(registros: any[]): HistorialGroup[] {
    if (!registros.length) {
      return [];
    }

    const grupos = new Map<string, any[]>();

    registros.forEach((registro) => {
      // Obtenemos la fecha en formato YYYY-MM-DD para agrupar
      const fechaKey = registro.fecha.split('T')[0];
      if (!grupos.has(fechaKey)) {
        grupos.set(fechaKey, []);
      }
      grupos.get(fechaKey)?.push(registro);
    });

    // Convertimos el mapa a un array de objetos
    return Array.from(grupos.entries()).map(([fecha, registrosDelDia]) => ({
      fecha: this.formatearEtiquetaFecha(fecha),
      registros: registrosDelDia,
    }));
  }

  // Nueva función para mostrar fechas amigables como "Hoy" o "Ayer"
  private formatearEtiquetaFecha(fechaKey: string): string {
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);

    const fechaRegistro = new Date(fechaKey + 'T00:00:00'); // Aseguramos que sea a medianoche

    if (fechaRegistro.toDateString() === hoy.toDateString()) {
      return 'Hoy';
    }
    if (fechaRegistro.toDateString() === ayer.toDateString()) {
      return 'Ayer';
    }
    // Para otras fechas, las mostramos en un formato largo y legible
    return fechaRegistro.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  handleRefresh(event: any) {
    this.cargarHistorial(event);
  }
}
