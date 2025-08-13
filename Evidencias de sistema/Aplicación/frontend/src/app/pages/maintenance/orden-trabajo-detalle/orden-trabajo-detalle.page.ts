// frontend/src/app/pages/maintenance/orden-trabajo-detalle/orden-trabajo-detalle.page.ts

import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  LoadingController,
  ToastController,
  ModalController,
} from '@ionic/angular';
import {
  ApiService,
  OrdenTrabajoDetalle,
  DetalleOtData,
  UsuarioResumen,
} from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  closeCircleOutline,
  helpCircleOutline,
  saveOutline,
  flagOutline,
  personAddOutline,
  personCircleOutline,
  personOutline,
  carSportOutline,
  speedometerOutline,
  documentTextOutline,
  close,
  warning,
  checkmarkCircle,
  closeCircle,
  calendarOutline,
  checkmarkDoneOutline,
  banOutline,
  warningOutline,
  eyeOutline,
  playCircleOutline,
  timeOutline,
} from 'ionicons/icons';
import { AlertaPersonalizadaComponent } from '../../../componentes/alerta-personalizada/alerta-personalizada.component';
import { RechazoOtModalComponent } from '../../../components/rechazo-ot-modal/rechazo-ot-modal.component';

@Component({
  selector: 'app-orden-trabajo-detalle',
  templateUrl: './orden-trabajo-detalle.page.html',
  styleUrls: ['./orden-trabajo-detalle.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class OrdenTrabajoDetallePage implements OnInit {
  @Input() ordenTrabajoId: number | null = null;
  @Input() isViewMode: boolean = false;

  // Propiedades para los segmentos
  selectedTab: string = 'infoGeneral';

  ordenTrabajo: OrdenTrabajoDetalle | null = null;
  isLoading: boolean = false;
  tecnicos: UsuarioResumen[] = [];
  pageTitle: string = 'Detalle de Orden de Trabajo';

  // Restricción de rol para asignación de técnicos
  canAssignTechnicians: boolean = false;

  // Usuario actual para validaciones
  currentUser: any = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController
  ) {
    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      helpCircleOutline,
      saveOutline,
      flagOutline,
      personAddOutline,
      personCircleOutline,
      personOutline,
      carSportOutline,
      speedometerOutline,
      documentTextOutline,
      close,
      warning,
      checkmarkCircle,
      closeCircle,
      calendarOutline,
      checkmarkDoneOutline,
      banOutline,
      warningOutline,
      eyeOutline,
      playCircleOutline,
      timeOutline,
    });
  }

  ngOnInit() {
    // Verificar permisos del usuario
    this.checkUserPermissions();

    if (this.ordenTrabajoId) {
      this.cargarDatosDePagina();
    }
  }

  /**
   * Verifica si el usuario actual tiene permisos para asignar técnicos
   */
  private checkUserPermissions() {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      // Solo usuarios con rol "mantenimiento" pueden asignar técnicos
      this.canAssignTechnicians = this.currentUser.rol === 'mantenimiento';
      console.log('🔐 Permisos de usuario verificados:', {
        rol: this.currentUser.rol,
        canAssignTechnicians: this.canAssignTechnicians,
        userId: this.currentUser.idUsu,
      });
    } else {
      this.canAssignTechnicians = false;
      console.log('⚠️ No se pudo obtener información del usuario');
    }
  }

  // Método para cambiar entre segmentos
  segmentChanged(event: any) {
    this.selectedTab = event.detail.value;
  }

  async cargarDatosDePagina() {
    if (!this.ordenTrabajoId) {
      this.closeModal();
      return;
    }

    this.isLoading = true;

    const loading = await this.loadingCtrl.create({
      message: 'Cargando datos...',
    });
    await loading.present();

    this.apiService.getOrdenTrabajoById(this.ordenTrabajoId).subscribe({
      next: (data) => {
        this.ordenTrabajo = data;
        // Añadir logs para depurar el encargado
        console.log('🔍 Datos cargados de orden de trabajo:', {
          id_ot: data.id_ot,
          estado: data.estado_ot,
          solicitante: data.solicitante
            ? `${data.solicitante.pri_nom_usu} ${data.solicitante.pri_ape_usu}`
            : 'No definido',
          encargado: data.encargado
            ? `${data.encargado.pri_nom_usu} ${data.encargado.pri_ape_usu}`
            : 'No definido',
          encargadoObj: data.encargado,
        });
        this.isLoading = false;
        loading.dismiss();
        this.cargarTecnicos();
      },
      error: async (error) => {
        this.isLoading = false;
        loading.dismiss();

        const modal = await this.modalCtrl.create({
          component: AlertaPersonalizadaComponent,
          componentProps: {
            title: 'Error',
            message: 'No se pudo cargar la información de la orden de trabajo.',
            icon: 'error',
            buttons: [{ text: 'Aceptar', role: 'confirm' }],
          },
          cssClass: 'custom-alert-modal',
        });
        await modal.present();
        this.closeModal();
      },
    });
  }

  cargarTecnicos() {
    this.apiService.getUsuariosPorRol('tecnico').subscribe({
      next: (data) => (this.tecnicos = data),
      error: async (err) => {
        const modal = await this.modalCtrl.create({
          component: AlertaPersonalizadaComponent,
          componentProps: {
            title: 'Advertencia',
            message: 'No se pudieron cargar los técnicos disponibles.',
            icon: 'warning',
            buttons: [{ text: 'Entendido', role: 'confirm' }],
          },
          cssClass: 'custom-alert-modal',
        });
        await modal.present();
      },
    });
  }

  /**
   * Maneja el cambio de técnico en el dropdown
   * @param tarea La tarea a la cual asignar el técnico
   * @param event El evento del dropdown
   */
  async onTecnicoChange(tarea: DetalleOtData, event: any) {
    // Verificar permisos antes de permitir asignación
    if (!this.canAssignTechnicians) {
      const modal = await this.modalCtrl.create({
        component: AlertaPersonalizadaComponent,
        componentProps: {
          title: 'Acceso Restringido',
          message:
            'Solo los usuarios con rol de <strong>mantenimiento</strong> pueden asignar técnicos a las tareas.',
          icon: 'warning',
          buttons: [{ text: 'Entendido', role: 'confirm' }],
        },
        cssClass: 'custom-alert-modal',
      });
      await modal.present();
      return;
    }

    const tecnicoId = event.detail.value;

    if (tecnicoId === null) {
      // Desasignar técnico
      tarea.tecnico = undefined;
      console.log('🔄 Técnico desasignado de la tarea:', tarea.desc_det);
    } else {
      // Asignar nuevo técnico
      const tecnicoSeleccionado = this.tecnicos.find(
        (t) => t.id_usu === tecnicoId
      );
      if (tecnicoSeleccionado) {
        tarea.tecnico = tecnicoSeleccionado;
        console.log('👨‍🔧 Técnico asignado:', {
          tarea: tarea.desc_det,
          tecnico: `${tecnicoSeleccionado.pri_nom_usu} ${tecnicoSeleccionado.pri_ape_usu}`,
        });
      }
    }
  }

  async iniciarOrdenDeTrabajo() {
    if (!this.ordenTrabajo) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.presentToast('No se pudo identificar al usuario actual.', 'danger');
      return;
    }

    // Validar estado del vehículo antes de iniciar la OT
    const vehiculoId =
      this.ordenTrabajo?.vehiculo_id_vehi ||
      this.ordenTrabajo?.vehiculo?.id_vehi;
    if (vehiculoId) {
      const vehiculoValido = await this.validarEstadoVehiculoParaOt(vehiculoId);
      if (!vehiculoValido) {
        return; // El método ya muestra el toast de error
      }
    }

    const confirmModal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: 'Iniciar Orden de Trabajo',
        message: `¿Confirmas iniciar la OT #${this.ordenTrabajo.id_ot}? Serás asignado como encargado.`,
        icon: 'help',
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'button-cancel' },
          { text: 'Sí, Iniciar', role: 'confirm', cssClass: 'confirm-button' },
        ],
      },
      backdropDismiss: false,
      cssClass: 'custom-alert-modal',
    });

    await confirmModal.present();
    const { data } = await confirmModal.onDidDismiss();

    if (data === 'confirm') {
      const loading = await this.loadingCtrl.create({
        message: 'Iniciando orden de trabajo...',
      });
      await loading.present();
      console.log('[PASO 1 - COMPONENTE] Datos que se enviarán al servicio:', {
        id_ot: this.ordenTrabajo.id_ot,
        estado: 'en_progreso',
        encargadoId: currentUser.idUsu,
      });
      this.apiService
        .actualizarEstadoOt(
          this.ordenTrabajo.id_ot,
          'en_progreso',
          currentUser.idUsu
        )
        .subscribe({
          next: async () => {
            // Debugging: verificar datos del vehículo
            console.log(
              '🔍 DEBUG - Datos de la orden de trabajo:',
              this.ordenTrabajo
            );
            console.log(
              '🔍 DEBUG - Vehículo en OT:',
              this.ordenTrabajo?.vehiculo
            );
            console.log(
              '🔍 DEBUG - vehiculo_id_vehi:',
              this.ordenTrabajo?.vehiculo_id_vehi
            );

            // Actualizar estado del vehículo a "mantenimiento"
            const vehiculoId =
              this.ordenTrabajo?.vehiculo_id_vehi ||
              this.ordenTrabajo?.vehiculo?.id_vehi;
            console.log('🔍 DEBUG - ID de vehículo obtenido:', vehiculoId);

            if (vehiculoId) {
              console.log(
                '🚗 Actualizando estado del vehículo a mantenimiento...'
              );
              await this.actualizarEstadoVehiculo(vehiculoId, 'mantenimiento');
            } else {
              console.warn(
                '⚠️ No se pudo obtener el ID del vehículo para actualizar su estado'
              );
            }

            await loading.dismiss();
            this.presentToast(
              'Orden de Trabajo iniciada. El vehículo ha sido marcado como "En Mantenimiento".',
              'success'
            );
            // Recargar datos para mostrar al encargado actualizado
            this.cargarDatosDePagina();
          },
          error: async (err) => {
            await loading.dismiss();
            console.error('Error al iniciar OT:', err);

            let title = 'Error';
            let message = 'No se pudo iniciar la orden de trabajo.';
            let icon = 'error';

            // Manejar errores específicos de validación de vehículo
            if (
              err.status === 409 &&
              err.error?.tipo === 'validacion_vehiculo'
            ) {
              title = 'Vehículo No Disponible';
              message =
                err.error.error ||
                'El vehículo no está disponible para iniciar una orden de trabajo.';
              icon = 'warning';
            } else if (err.error?.error) {
              message = err.error.error;
            }

            const errorModal = await this.modalCtrl.create({
              component: AlertaPersonalizadaComponent,
              componentProps: {
                title: title,
                message: message,
                icon: icon,
                buttons: [{ text: 'Aceptar', role: 'confirm' }],
              },
              cssClass: 'custom-alert-modal',
            });
            await errorModal.present();
          },
        });
    }
  }

  async guardarProgresoTareas() {
    if (!this.ordenTrabajo || !this.ordenTrabajo.detalles) {
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Guardando progreso de tareas...',
    });
    await loading.present();

    // Preparar detalles para actualizar con estado de checklist y técnicos asignados
    const detallesParaActualizar = this.ordenTrabajo.detalles.map((tarea) => ({
      id_det: tarea.id_det,
      checklist: tarea.checklist, // Estado de completado de la tarea
      usuario_id_usu_tecnico: tarea.tecnico ? tarea.tecnico.id_usu : null, // Técnico asignado
    }));

    const datosParaActualizar = {
      km_ot: this.ordenTrabajo.km_ot,
      descripcion_ot: this.ordenTrabajo.descripcion_ot,
      detalles: detallesParaActualizar,
    };

    console.log('📝 Guardando progreso de tareas:', {
      id_ot: this.ordenTrabajo.id_ot,
      cantidadTareas: detallesParaActualizar.length,
      tareasCompletadas: detallesParaActualizar.filter((t) => t.checklist)
        .length,
      tareasConTecnico: detallesParaActualizar.filter(
        (t) => t.usuario_id_usu_tecnico
      ).length,
      datos: datosParaActualizar,
    });

    this.apiService
      .actualizarDetallesOt(this.ordenTrabajo.id_ot, datosParaActualizar)
      .subscribe({
        next: async (response) => {
          await loading.dismiss();

          // Contar tareas completadas y con técnico asignado para el mensaje
          const tareasCompletadas = detallesParaActualizar.filter(
            (t) => t.checklist
          ).length;
          const tareasConTecnico = detallesParaActualizar.filter(
            (t) => t.usuario_id_usu_tecnico
          ).length;

          let mensaje = 'Progreso guardado con éxito.';
          if (tareasCompletadas > 0) {
            mensaje += ` ${tareasCompletadas} tarea(s) marcada(s) como completada(s).`;
          }
          if (tareasConTecnico > 0) {
            mensaje += ` ${tareasConTecnico} tarea(s) con técnico asignado.`;
          }

          this.presentToast(mensaje, 'success', 3000);

          // Opcional: recargar datos para sincronizar con el servidor
          // this.cargarDatosDePagina();
        },
        error: async (err) => {
          await loading.dismiss();
          console.error('Error al guardar progreso:', err);

          let errorMessage = 'No se pudieron guardar los cambios.';
          if (err.error?.error) {
            errorMessage = err.error.error;
          }

          const errorModal = await this.modalCtrl.create({
            component: AlertaPersonalizadaComponent,
            componentProps: {
              title: 'Error al Guardar',
              message: errorMessage,
              icon: 'error',
              buttons: [{ text: 'Aceptar', role: 'confirm' }],
            },
            cssClass: 'custom-alert-modal',
          });
          await errorModal.present();
        },
      });
  }

  async finalizarOrdenDeTrabajo() {
    if (!this.ordenTrabajo) return;

    const todasCompletas = this.ordenTrabajo.detalles.every((t) => t.checklist);

    if (!todasCompletas) {
      const warnModal = await this.modalCtrl.create({
        component: AlertaPersonalizadaComponent,
        componentProps: {
          title: 'Advertencia',
          message:
            'Debes completar todas las tareas para poder finalizar la OT.',
          icon: 'warning',
          buttons: [{ text: 'Entendido', role: 'confirm' }],
        },
        cssClass: 'custom-alert-modal',
      });
      await warnModal.present();
      return;
    }

    const confirmModal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: 'Finalizar Orden de Trabajo',
        message:
          '¿Estás seguro de finalizar esta OT? La acción no se puede deshacer.',
        icon: 'help',
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'button-cancel' },
          {
            text: 'Sí, Finalizar',
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

    if (data === 'confirm') {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        this.presentToast(
          'Error: No se pudo identificar al usuario actual.',
          'danger'
        );
        return;
      }

      const loading = await this.loadingCtrl.create({
        message: 'Finalizando orden de trabajo...',
      });
      await loading.present();

      this.apiService
        .actualizarEstadoOt(
          this.ordenTrabajo.id_ot,
          'completada',
          currentUser.idUsu
        )
        .subscribe({
          next: async () => {
            // Actualizar estado del vehículo a "activo"
            const vehiculoId =
              this.ordenTrabajo?.vehiculo_id_vehi ||
              this.ordenTrabajo?.vehiculo?.id_vehi;
            if (vehiculoId) {
              await this.actualizarEstadoVehiculo(vehiculoId, 'activo');
            }

            await loading.dismiss();
            this.presentToast(
              'Orden de Trabajo finalizada. El vehículo ha vuelto a estado "Activo".',
              'success'
            );
            this.closeModal(true);
          },
          error: async (err) => {
            await loading.dismiss();
            const errorModal = await this.modalCtrl.create({
              component: AlertaPersonalizadaComponent,
              componentProps: {
                title: 'Error',
                message: 'No se pudo finalizar la orden de trabajo.',
                icon: 'error',
                buttons: [{ text: 'Aceptar', role: 'confirm' }],
              },
              cssClass: 'custom-alert-modal',
            });
            await errorModal.present();
          },
        });
    }
  }

  async rechazarOt() {
    if (!this.ordenTrabajo) return;

    // Verificar que el estado permita el rechazo
    if (this.ordenTrabajo.estado_ot !== 'sin_iniciar') {
      this.presentToast(
        'Solo se pueden deshabilitar órdenes de trabajo que no han sido iniciadas.',
        'warning'
      );
      return;
    }

    const modal = await this.modalCtrl.create({
      component: RechazoOtModalComponent,
      componentProps: {
        ordenTrabajo: this.ordenTrabajo,
      },
      cssClass: 'desktop-fullscreen',
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data && data.rechazado) {
      const loading = await this.loadingCtrl.create({
        message: 'Deshabilitando orden de trabajo...',
      });
      await loading.present();

      // Usar un ID de usuario por defecto si no se puede obtener
      const userId = this.currentUser?.idUsu || 1;

      this.apiService
        .rechazarOrdenTrabajo(this.ordenTrabajo.id_ot, data.motivo, userId)
        .subscribe({
          next: async (response) => {
            // Si la OT se rechaza, el vehículo debe volver a estado activo
            const vehiculoId =
              this.ordenTrabajo?.vehiculo_id_vehi ||
              this.ordenTrabajo?.vehiculo?.id_vehi;
            if (vehiculoId) {
              await this.actualizarEstadoVehiculo(vehiculoId, 'activo');
            }

            await loading.dismiss();
            this.presentToast(
              response.message ||
                'Orden de trabajo deshabilitada correctamente.',
              'success'
            );
            this.cargarDatosDePagina(); // Recargar datos para mostrar el nuevo estado
          },
          error: async (err) => {
            await loading.dismiss();
            console.error('Error al rechazar OT:', err);
            this.presentToast(
              err.message || 'No se pudo deshabilitar la orden de trabajo.',
              'danger'
            );
          },
        });
    }
  }

  getColorForStatus(estado: string | undefined): string {
    if (!estado) return 'medium';
    const colores: { [key: string]: string } = {
      sin_iniciar: 'primary',
      en_progreso: 'warning',
      completada: 'success',
      cancelada: 'dark',
      rechazado: 'danger',
    };
    return colores[estado] || 'medium';
  }

  getStatusDisplayName(estado: string | undefined): string {
    if (!estado) return 'Sin estado';

    const estadosDisplay: { [key: string]: string } = {
      sin_iniciar: 'Sin Iniciar',
      en_progreso: 'En Progreso',
      completada: 'Completada',
      cancelada: 'Cancelada',
      rechazado: 'Deshabilitada',
    };

    return estadosDisplay[estado] || estado;
  }

  // Método para verificar si todas las tareas están completas
  todasTareasCompletas(): boolean {
    if (!this.ordenTrabajo || !this.ordenTrabajo.detalles) {
      return false;
    }
    return this.ordenTrabajo.detalles.every((tarea) => tarea.checklist);
  }
  // Método para formatear kilometraje con puntos como separadores de miles
  formatKilometraje(kilometraje: number | null | undefined): string {
    if (kilometraje === null || kilometraje === undefined) {
      return '';
    }
    return kilometraje.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  // Método para manejar cambios en el campo de kilometraje
  onKilometrajeChange(event: any) {
    const value = event.target.value;
    // Remover puntos para obtener el número puro
    const numberValue = value.replace(/\./g, '');

    // Validar que solo contenga números
    if (/^\d*$/.test(numberValue)) {
      // Convertir a número y asignar (usar 0 en lugar de null)
      this.ordenTrabajo!.km_ot = numberValue ? parseInt(numberValue, 10) : 0;

      // Actualizar el valor mostrado con formato
      event.target.value = this.formatKilometraje(this.ordenTrabajo!.km_ot);
    } else {
      // Si contiene caracteres no válidos, restaurar el valor anterior
      event.target.value = this.formatKilometraje(this.ordenTrabajo!.km_ot);
    }
  }

  isValidDate(dateStr: any): boolean {
    if (!dateStr) return false;

    if (typeof dateStr === 'string') {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }

    if (dateStr instanceof Date) {
      return !isNaN(dateStr.getTime());
    }

    return false;
  }

  async presentToast(
    mensaje: string,
    color: string = 'dark',
    duracion: number = 2000
  ) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: duracion,
      color: color,
      position: 'bottom',
    });
    toast.present();
  }

  async closeModal(updated: boolean = false) {
    await this.modalCtrl.dismiss({
      updated: updated,
    });
  }

  /**
   * Actualiza el estado de un vehículo
   * @param vehiculoId ID del vehículo a actualizar
   * @param nuevoEstado Nuevo estado del vehículo ('activo', 'mantenimiento', 'inactivo')
   */
  private async actualizarEstadoVehiculo(
    vehiculoId: number,
    nuevoEstado: 'activo' | 'mantenimiento' | 'inactivo'
  ): Promise<void> {
    try {
      console.log(
        `🚗 Iniciando actualización de estado del vehículo ${vehiculoId} a: ${nuevoEstado}`
      );

      const updateData = { estadoVehi: nuevoEstado };
      console.log('📤 Datos a enviar:', updateData);

      const result = await this.apiService
        .updateVehicle(vehiculoId, updateData)
        .toPromise();

      console.log(
        `✅ Estado del vehículo ${vehiculoId} actualizado exitosamente:`,
        result
      );

      // Mostrar toast de confirmación
      this.presentToast(
        `Vehículo actualizado a estado: ${nuevoEstado}`,
        'success',
        1500
      );
    } catch (error) {
      console.error(
        `❌ Error al actualizar estado del vehículo ${vehiculoId}:`,
        error
      );

      // Mostrar toast de error
      this.presentToast(
        `Error al actualizar estado del vehículo`,
        'danger',
        2000
      );
    }
  }

  /**
   * Valida que el vehículo esté en estado válido para iniciar una OT
   * @param vehiculoId ID del vehículo a validar
   * @returns true si el vehículo puede iniciar una OT, false si no
   */
  private async validarEstadoVehiculoParaOt(
    vehiculoId: number
  ): Promise<boolean> {
    try {
      console.log(
        `🔍 Validando estado del vehículo ${vehiculoId} antes de iniciar OT...`
      );

      const vehiculo = await this.apiService.getVehicle(vehiculoId).toPromise();
      console.log('🚗 Estado actual del vehículo:', vehiculo?.estadoVehi);

      if (vehiculo?.estadoVehi === 'mantenimiento') {
        const modal = await this.modalCtrl.create({
          component: AlertaPersonalizadaComponent,
          componentProps: {
            title: 'Vehículo No Disponible',
            message: `El vehículo <strong>${vehiculo.patente}</strong> está actualmente en estado de <strong>mantenimiento</strong>. No se puede iniciar una nueva orden de trabajo hasta que se complete el mantenimiento actual.`,
            icon: 'warning',
            buttons: [{ text: 'Entendido', role: 'confirm' }],
          },
          cssClass: 'custom-alert-modal',
        });
        await modal.present();
        return false;
      }

      if (vehiculo?.estadoVehi === 'inactivo') {
        const modal = await this.modalCtrl.create({
          component: AlertaPersonalizadaComponent,
          componentProps: {
            title: 'Vehículo Inactivo',
            message: `El vehículo <strong>${vehiculo.patente}</strong> está en estado <strong>inactivo</strong>. No se pueden realizar órdenes de trabajo en vehículos inactivos.`,
            icon: 'warning',
            buttons: [{ text: 'Entendido', role: 'confirm' }],
          },
          cssClass: 'custom-alert-modal',
        });
        await modal.present();
        return false;
      }

      console.log('✅ Vehículo disponible para iniciar OT');
      return true;
    } catch (error) {
      console.error('❌ Error al validar estado del vehículo:', error);
      this.presentToast('Error al verificar el estado del vehículo.', 'danger');
      return false;
    }
  }

  // Método para manejar el cambio de estado del checkbox de tareas
  onTaskCheckboxChange(tarea: DetalleOtData, event: any) {
    const isChecked = event.detail.checked;

    // Verificar que la orden de trabajo esté en progreso antes de permitir marcar tareas
    if (this.ordenTrabajo?.estado_ot !== 'en_progreso' && isChecked) {
      // Revertir el checkbox
      event.target.checked = false;
      tarea.checklist = false;

      // Mostrar toast de advertencia
      this.presentToast(
        'Solo se pueden marcar tareas completadas cuando la orden de trabajo está en progreso.',
        'warning',
        3000
      );
      return;
    }

    // Verificar permisos para editar esta tarea específica
    if (!this.canEditTask(tarea) && isChecked) {
      // Revertir el checkbox
      event.target.checked = false;
      tarea.checklist = false;

      // Mostrar toast específico según el rol
      let message = 'No tienes permisos para editar esta tarea.';
      if (this.currentUser?.rol === 'tecnico') {
        message = 'Solo puedes completar las tareas que te han sido asignadas.';
      }

      this.presentToast(message, 'warning', 3000);
      return;
    }

    // Si todas las validaciones pasan, actualizar el estado de la tarea
    tarea.checklist = isChecked;
  }

  /**
   * Verifica si el usuario actual puede editar una tarea específica
   * @param tarea La tarea a verificar
   * @returns true si puede editar, false si no
   */
  canEditTask(tarea: DetalleOtData): boolean {
    if (!this.currentUser) return false;

    // Los usuarios de mantenimiento pueden editar todas las tareas
    if (this.currentUser.rol === 'mantenimiento') {
      return true;
    }

    // Los técnicos solo pueden editar las tareas que se les han asignado
    if (this.currentUser.rol === 'tecnico') {
      return tarea.tecnico?.id_usu === this.currentUser.idUsu;
    }

    // Otros roles no pueden editar tareas
    return false;
  }

  /**
   * Verifica si el usuario actual puede ver una tarea (pero no necesariamente editarla)
   * @param tarea La tarea a verificar
   * @returns true si puede ver, false si no
   */
  canViewTask(tarea: DetalleOtData): boolean {
    if (!this.currentUser) return false;

    // Los usuarios de mantenimiento pueden ver todas las tareas
    if (this.currentUser.rol === 'mantenimiento') {
      return true;
    }

    // Los técnicos pueden ver todas las tareas (propias y de otros)
    if (this.currentUser.rol === 'tecnico') {
      return true;
    }

    // Otros roles pueden ver tareas (implementar según necesidades específicas)
    return true;
  }

  /**
   * Verifica si el usuario actual puede guardar el progreso de las tareas
   * @returns true si puede guardar progreso, false si no
   */
  canSaveProgress(): boolean {
    if (!this.currentUser) return false;

    // Los usuarios de mantenimiento siempre pueden guardar progreso
    if (this.currentUser.rol === 'mantenimiento') {
      return true;
    }

    // Los técnicos pueden guardar progreso si tienen al menos una tarea asignada
    if (this.currentUser.rol === 'tecnico' && this.ordenTrabajo?.detalles) {
      return this.ordenTrabajo.detalles.some(
        (tarea) => tarea.tecnico?.id_usu === this.currentUser.idUsu
      );
    }

    return false;
  }

  /**
   * Verifica si el usuario actual puede finalizar la orden de trabajo
   * @returns true si puede finalizar, false si no
   */
  canFinishWorkOrder(): boolean {
    if (!this.currentUser) return false;

    // Solo usuarios de mantenimiento pueden finalizar órdenes de trabajo
    return this.currentUser.rol === 'mantenimiento';
  }

  /**
   * Verifica si el usuario actual puede iniciar una orden de trabajo
   * @returns true si puede iniciar, false si no
   */
  canStartWorkOrder(): boolean {
    if (!this.currentUser) return false;

    // Solo usuarios de mantenimiento pueden iniciar órdenes de trabajo
    return this.currentUser.rol === 'mantenimiento';
  }

  /**
   * Verifica si el usuario actual puede rechazar una orden de trabajo
   * @returns true si puede rechazar, false si no
   */
  canRejectWorkOrder(): boolean {
    if (!this.currentUser) return false;

    // Solo usuarios de mantenimiento pueden rechazar órdenes de trabajo
    return this.currentUser.rol === 'mantenimiento';
  }

  /**
   * Verifica si el usuario actual puede editar los campos generales de la orden de trabajo
   * @returns true si puede editar, false si no
   */
  canEditGeneralFields(): boolean {
    if (!this.currentUser) return false;

    // Solo usuarios de mantenimiento pueden editar campos generales
    return this.currentUser.rol === 'mantenimiento';
  }

  /**
   * Formatea la duración en minutos a un formato legible
   * @param minutes Duración en minutos
   * @returns String formateado (ej: "2h 30m", "45m", "1h")
   */
  formatDuration(minutes: number | null | undefined): string {
    if (!minutes || minutes <= 0) {
      return '0m';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes}m`;
    } else if (remainingMinutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  }
}
