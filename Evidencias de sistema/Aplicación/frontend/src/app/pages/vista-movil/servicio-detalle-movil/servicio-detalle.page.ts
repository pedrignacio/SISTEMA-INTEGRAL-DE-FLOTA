import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  NavController,
  ToastController,
  LoadingController,
} from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import {
  ApiService,
  OrdenTrabajoDetalle,
  DetalleOtData,
} from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-servicio-detalle',
  templateUrl: './servicio-detalle.page.html',
  styleUrls: ['./servicio-detalle.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ServicioDetallePage implements OnInit {
  ot: OrdenTrabajoDetalle | null = null;
  isLoading = true;
  otId: number = 0;
  currentUser: any = null;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private navCtrl: NavController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.presentToast('Error: Usuario no autenticado');
      this.navCtrl.back();
      return;
    }

    this.otId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarDetalleOT();
  }

  cargarDetalleOT() {
    this.isLoading = true;
    this.apiService.getOrdenTrabajoById(this.otId).subscribe({
      next: (data) => {
        this.ot = data;
        this.isLoading = false;

        // 👇 AGREGAR AQUÍ EL DEBUGGING
        this.logTareasInfo();

        // Verificar que el técnico tenga al menos una tarea asignada
        if (!this.tieneAlMenosUnaTareaAsignada()) {
          this.presentToast(
            'No tienes tareas asignadas en esta orden de trabajo'
          );
          this.navCtrl.back();
        }
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.presentToast('Error al cargar el detalle de la OT.');
        this.navCtrl.back();
      },
    });
  }

  /**
   * Verifica si el técnico actual puede editar una tarea específica
   */
  puedeEditarTarea(tarea: DetalleOtData): boolean {
    // Usamos verificación doble para mayor compatibilidad
    return tarea.tecnico?.id_usu === this.currentUser?.id_usu;
  }

  /**
   * Verifica si el técnico tiene al menos una tarea asignada
   */
  tieneAlMenosUnaTareaAsignada(): boolean {
    if (!this.ot?.detalles || !this.currentUser) return false;

    return this.ot.detalles.some(
      (tarea) => tarea.tecnico?.id_usu === this.currentUser.id_usu
    );
  }

  /**
   * Obtiene estadísticas de las tareas del técnico
   */
  getEstadisticasTareas() {
    if (!this.ot?.detalles || !this.currentUser) {
      return { asignadas: 0, completadas: 0, pendientes: 0 };
    }

    const tareasAsignadas = this.ot.detalles.filter(
      (tarea) => tarea.tecnico?.id_usu === this.currentUser.id_usu
    );

    const completadas = tareasAsignadas.filter(
      (tarea) => tarea.checklist
    ).length;
    const pendientes = tareasAsignadas.length - completadas;

    return {
      asignadas: tareasAsignadas.length,
      completadas: completadas,
      pendientes: pendientes,
    };
  }

  /**
   * Maneja el cambio de estado de una tarea
   */
  onTareaChange(tarea: DetalleOtData, event: any) {
    const isChecked = event.detail.checked;

    // Verificar permisos
    if (!this.puedeEditarTarea(tarea)) {
      // Revertir el cambio
      event.target.checked = !isChecked;
      tarea.checklist = !isChecked;
      this.presentToast(
        'Solo puedes completar las tareas que te han sido asignadas'
      );
      return;
    }

    // Verificar que la OT esté en progreso
    if (this.ot?.estado_ot !== 'en_progreso' && isChecked) {
      event.target.checked = false;
      tarea.checklist = false;
      this.presentToast(
        'Solo se pueden completar tareas cuando la OT está en progreso'
      );
      return;
    }

    // Si todo está bien, actualizar el estado
    tarea.checklist = isChecked;
  }

  async guardarProgreso() {
    if (!this.ot) return;

    // Verificar que tiene tareas asignadas
    if (!this.tieneAlMenosUnaTareaAsignada()) {
      this.presentToast('No tienes tareas asignadas para guardar');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Guardando progreso...',
    });
    await loading.present();

    // Preparar solo las tareas que el técnico puede editar
    const detallesParaActualizar = this.ot.detalles

      .filter((tarea) => this.puedeEditarTarea(tarea))
      .map((tarea) => ({
        id_det: tarea.id_det,
        checklist: tarea.checklist,
        desc_det: tarea.desc_det, // Usar desc_det como campo editable
        usuario_id_usu_tecnico: tarea.tecnico ? tarea.tecnico.id_usu : null,
      }));

    const payload = {
      km_ot: this.ot.km_ot,
      descripcion_ot: this.ot.descripcion_ot,
      detalles: detallesParaActualizar,
    };

    const stats = this.getEstadisticasTareas();
    console.log('📱 Técnico guardando progreso:', {
      tecnico: this.currentUser.priNomUsu,
      tareasAsignadas: stats.asignadas,
      tareasCompletadas: stats.completadas,
      payload: payload,
    });

    this.apiService.actualizarDetallesOt(this.otId, payload).subscribe({
      next: async () => {
        await loading.dismiss();
        let mensaje = 'Progreso guardado con éxito.';
        if (stats.completadas > 0) {
          mensaje += ` ${stats.completadas} de ${stats.asignadas} tareas completadas.`;
        }
        await this.presentToast(mensaje);
        this.navCtrl.back();
      },
      error: async (err) => {
        await loading.dismiss();
        await this.presentToast('Error al guardar el progreso.');
        console.error('Error guardando progreso:', err);
      },
    });
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
    });
    toast.present();
  }

  /**
   * Método para depurar información sobre las tareas
   */
  logTareasInfo() {
    if (!this.ot || !this.ot.detalles) return;

    console.log('📋 INFORMACIÓN DE TAREAS:', {
      totalTareas: this.ot.detalles.length,
      tareas: this.ot.detalles.map((t) => ({
        id: t.id_det,
        descripcion: t.desc_det,
        checklist: t.checklist,
        tecnicoAsignado: t.tecnico
          ? {
              id_usu: t.tecnico.id_usu,

              nombre: `${t.tecnico.pri_nom_usu || ''} ${
                t.tecnico.pri_ape_usu || ''
              }`,
            }
          : 'No asignado',
        campo_usuario_id: t.tecnico?.id_usu || null,
      })),
      currentUser: {
        id_usu: this.currentUser?.id_usu,
        idUsu: this.currentUser?.idUsu,
        nombre: `${this.currentUser?.pri_nom_usu || ''} ${
          this.currentUser?.pri_ape_usu || ''
        }`,
        nombreAlt: `${this.currentUser?.priNomUsu || ''} ${
          this.currentUser?.priApeUsu || ''
        }`,
      },
    });
  }
}
