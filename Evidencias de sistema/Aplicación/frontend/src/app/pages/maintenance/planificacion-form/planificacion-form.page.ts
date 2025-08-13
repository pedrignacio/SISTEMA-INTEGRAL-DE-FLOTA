import { Component, OnInit, Input } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  AbstractControl,
  ReactiveFormsModule,
  FormsModule,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  NavController,
  ToastController,
  LoadingController,
  AlertController,
  ModalController,
} from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  saveOutline,
  addCircleOutline,
  removeCircleOutline,
  closeCircleOutline,
} from 'ionicons/icons';
import {
  ApiService,
  VehiculoAsignacionInfo,
  PlanificacionMantenimientoData,
  PlanificacionMantenimientoResumen,
} from '../../../services/api.service'; // Ajusta la ruta
import { AlertaPersonalizadaComponent } from '../../../componentes/alerta-personalizada/alerta-personalizada.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-planificacion-form',
  templateUrl: './planificacion-form.page.html',
  styleUrls: ['./planificacion-form.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, FormsModule],
})
export class PlanificacionFormPage implements OnInit {
  @Input() planId?: number;
  @Input() isEditMode: boolean = false;
  @Input() isViewMode: boolean = false;

  planForm!: FormGroup;
  vehiculosDisponibles: VehiculoAsignacionInfo[] = [];
  isSubmitted = false;
  pageTitle = 'Crear Planificación';

  loadedTareas: any[] = [];
  loadedVehiculosIds: number[] = [];
  tareasDisponibles: any;
  tipoFrecuenciaSeleccionado: string | null = null;
  selectedTab = 'infoGeneral';

  esPreventivo: boolean = true;

  // Propiedad para la fecha mínima (hoy)
  minDate: string = new Date().toISOString().split('T')[0];

  // Nueva propiedad para la fecha original
  fechaOriginal?: string;

  // En tu archivo .ts
  fechaModificada: boolean = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private route: ActivatedRoute,
    private authService: AuthService
    
  ) {
    addIcons({
      closeOutline,
      saveOutline,
      addCircleOutline,
      removeCircleOutline,
      closeCircleOutline,
    });
  }

  setPreventivo(value: boolean) {
    if (this.isViewMode) return;
    this.esPreventivo = value;
    this.planForm.patchValue({ esPreventivo: value });
  }

  ngOnInit() {
    if (!this.planId) {
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.planId = parseInt(id);
          this.isEditMode = true;
        }
      });
    }

    this.updatePageTitle();
    this.initForm();
    this.cargarVehiculos();

    if (this.planId && (this.isEditMode || this.isViewMode)) {
      this.loadPlanificacionData();
    } else {
      this.agregarTarea();
    }

    this.tipoFrecuenciaSeleccionado =
      this.planForm.get('tipoFrecuencia')?.value || null;

    this.planForm.get('esPreventivo')?.valueChanges.subscribe((value) => {
      this.esPreventivo = value;
    });

    this.planForm.get('fechaActivacion')?.valueChanges.subscribe((newValue) => {
      if (this.isEditMode && this.fechaOriginal) {
        this.fechaModificada = newValue !== this.fechaOriginal;
      }
    });
  }

  updatePageTitle() {
    if (this.isViewMode) {
      this.pageTitle = 'Ver Planificación';
    } else if (this.isEditMode) {
      this.pageTitle = 'Editar Planificación';
    } else {
      this.pageTitle = 'Crear Planificación';
    }
  }
  initForm() {
    this.planForm = this.fb.group({
      descPlan: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(255),
        ],
      ],
      frecuencia: [null, [Validators.required, Validators.min(1)]],
      tipoFrecuencia: ['', Validators.required],
      fechaActivacion: [
        new Date().toISOString().split('T')[0],
        [Validators.required, this.noFechasAntiguas.bind(this)],
      ],
      tipoMantenimiento: ['preventivo', Validators.required],
      esPreventivo: [true, Validators.required],
      esActivoPlan: [true, Validators.required],
      vehiculosIds: [[], [Validators.required, Validators.minLength(1)]],
      tareas: this.fb.array([], [Validators.required, Validators.minLength(1)]),
    });
    if (this.tareas.length === 0) {
      this.agregarTarea();
    }
  }

  // Getter para acceder fácilmente a los controles del formulario
  get f() {
    return this.planForm.controls;
  }

  get tareas(): FormArray {
    return this.planForm.get('tareas') as FormArray;
  }

  crearTareaFormGroup(): FormGroup {
    return this.fb.group({
      nomTareaPlan: ['', [Validators.required, Validators.maxLength(150)]],
      descTareaPlan: ['', Validators.maxLength(500)],
    });
  }

  agregarTarea() {
    this.tareas.push(this.crearTareaFormGroup());
  }

  eliminarTarea(index: number) {
    if (this.tareas.length > 1) {
      this.tareas.removeAt(index);
    } else {
      this.mostrarToast(
        'Una planificación debe tener al menos una tarea.',
        'warning'
      );
    }
  }

  cargarVehiculos() {
    this.apiService.getVehiculosDisponibles().subscribe(
      (data) => {
        this.vehiculosDisponibles = data;
      },
      (error) => {
        console.error('Error cargando vehículos:', error);
        this.mostrarToast(
          error.message || 'Error al cargar la lista de vehículos.',
          'danger'
        );
      }
    );
  }
  async onSubmit() {
    // Confirmación en modo edición
    if (this.isEditMode) {
      const confirmModal = await this.modalCtrl.create({
        component: AlertaPersonalizadaComponent,
        componentProps: {
          title: 'Confirmar Edición',
          message: `¿Estás seguro de editar <strong>${this.pageTitle}</strong>?`,
          icon: 'warning',
          buttons: [
            { text: 'Cancelar', role: 'cancel', cssClass: 'button-cancel' },
            { text: 'Editar', role: 'confirm', cssClass: 'confirm-button' },
          ],
        },
        backdropDismiss: false,
        cssClass: 'custom-alert-modal',
      });
      await confirmModal.present();
      const { data } = await confirmModal.onDidDismiss();
      if (data !== 'confirm') return;
    }
    this.isSubmitted = true;
    this.planForm.markAllAsTouched();

    if (this.planForm.invalid) {
      const firstError = this.getFirstError();
      if (firstError) {
        try {
          // Cambiar al tab correcto si es necesario
          if (this.selectedTab !== firstError.tab) {
            this.selectedTab = firstError.tab;
            // Usar setTimeout para permitir que Angular actualice la vista
            setTimeout(() => {
              this.focusOnError(firstError);
            }, 300);
          } else {
            this.focusOnError(firstError);
          }
        } catch (error) {
          console.error('Error al cambiar de tab:', error);
          // Si falla el cambio de tab, al menos mostrar el mensaje de error
          this.mostrarToast(
            'Por favor, revise todos los campos del formulario.',
            'warning'
          );
        }
        return;
      }
    }

    // Confirmación antes de crear una nueva planificación
    if (!this.isEditMode) {
      const confirmModal = await this.modalCtrl.create({
        component: AlertaPersonalizadaComponent,
        componentProps: {
          title: 'Confirmar Creación',
          message: `¿Estás seguro de crear la planificación "${this.planForm.value.descPlan}"?`,
          icon: 'info',
          buttons: [
            { text: 'Cancelar', role: 'cancel', cssClass: 'button-cancel' },
            { text: 'Crear', role: 'confirm', cssClass: 'confirm-button' },
          ],
        },
        backdropDismiss: false,
        cssClass: 'custom-alert-modal',
      });
      await confirmModal.present();
      const { data } = await confirmModal.onDidDismiss();
      if (data !== 'confirm') {
        return;
      }
    }

    const isEditMode = this.isEditMode && this.planId;
    const loading = await this.loadingCtrl.create({
      message: isEditMode
        ? 'Actualizando planificación...'
        : 'Guardando planificación...',
    });
    await loading.present();

    // Construcción manual del objeto (estilo RouteFormPage)
    const planData: Partial<PlanificacionMantenimientoData> = {
      descPlan: this.planForm.value.descPlan,
      frecuencia: this.planForm.value.frecuencia,
      tipoFrecuencia: this.planForm.value.tipoFrecuencia,
      fechaActivacion: this.planForm.value.fechaActivacion,
      esPreventivo: this.planForm.value.esPreventivo,
      esActivoPlan: this.planForm.value.esActivoPlan,
      vehiculosIds: this.planForm.value.vehiculosIds,
      tareas: this.tareas.value,
    };

    console.log('Datos de la planificación a enviar:', planData);

    // Si estamos en modo edición, encontrar los vehículos nuevos
    let nuevosVehiculosIds: number[] = [];
    if (isEditMode && this.loadedVehiculosIds) {
      nuevosVehiculosIds =
        planData.vehiculosIds?.filter(
          (id) => !this.loadedVehiculosIds.includes(id)
        ) || [];

      console.log('Vehículos nuevos detectados:', nuevosVehiculosIds);
    }

    // Obtener ID del usuario actual
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      await loading.dismiss();
      this.mostrarToast(
        'No se pudo identificar el usuario actual. Por favor, inicie sesión nuevamente.',
        'danger'
      );
      return;
    }
    const idUsuario = currentUser.idUsu;

    const apiCall = isEditMode
      ? nuevosVehiculosIds.length > 0
        ? this.apiService.updatePlanificacionConOts(
            this.planId!,
            planData as PlanificacionMantenimientoData,
            nuevosVehiculosIds,
            idUsuario
          )
        : this.apiService.updatePlanificacion(
            this.planId!,
            planData as PlanificacionMantenimientoData
          )
      : this.apiService.crearPlanificacionConOts({
          ...(planData as PlanificacionMantenimientoData),
          idUsuarioSolicitante: idUsuario,
        });

    apiCall.subscribe({
      next: async (response) => {
        await loading.dismiss();

        let message: string;
        if (isEditMode) {
          message = `Planificación actualizada exitosamente.`;

          // Si se generaron OTs para nuevos vehículos
          if (response.otsGeneradas) {
            const numVehiculosNuevos = nuevosVehiculosIds.length;
            message += ` Se ${
              numVehiculosNuevos === 1 ? 'generó' : 'generaron'
            } ${numVehiculosNuevos} ${
              numVehiculosNuevos === 1 ? 'orden' : 'órdenes'
            } de trabajo para ${
              numVehiculosNuevos === 1
                ? 'el vehículo nuevo'
                : 'los vehículos nuevos'
            }.`;
          }
        } else {
          // Construir mensaje con información de OTs creadas
          const planificacionNombre =
            response.data?.planificacion?.descPlan || planData.descPlan;
          const otsCreadas = response.data?.ordenesTrabajo || [];

          message = `Planificación "${planificacionNombre}" creada exitosamente.`;

          if (otsCreadas.length > 0) {
            message += ` Se generaron automáticamente ${otsCreadas.length} orden(es) de trabajo.`;
          }
        }

        this.mostrarToast(message, 'success');

        if (this.modalCtrl) {
          await this.closeModal({
            planificacionCreated: !isEditMode,
            planificacionUpdated: isEditMode,
            otsCreadas: !isEditMode
              ? response.data?.ordenesTrabajo || []
              : response.otsGeneradas
              ? nuevosVehiculosIds
              : [],
            planificacionNombre: !isEditMode ? planData.descPlan : undefined,
            otsGeneradasEnEdicion: isEditMode && response.otsGeneradas,
          });
        } else {
          if (!isEditMode) {
            this.planForm.reset({
              esPreventivo: true,
              esActivoPlan: true,
              vehiculosIds: [],
            });
            this.tareas.clear();
            this.agregarTarea();
            this.isSubmitted = false;
          }
          this.navCtrl.navigateRoot('/tabs/planificaciones', {
            animationDirection: 'back',
          });
        }
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('Error al procesar planificación:', error);
        const errorMessage = isEditMode
          ? 'No se pudo actualizar la planificación. Intente más tarde.'
          : 'No se pudo crear la planificación. Intente más tarde.';
        this.mostrarToast(error.message || errorMessage, 'danger', 5000);
      },
    });
  }

  private focusOnError(firstError: { id: string; tab: string }) {
    const errorElement = document.getElementById(firstError.id);
    if (errorElement) {
      // Asegurar que el elemento es visible después del cambio de tab
      errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorElement.classList.add('shake-animation');
      setTimeout(() => errorElement.classList.remove('shake-animation'), 1000);

      // Generar mensaje específico según el tipo de error
      let fieldName = '';
      switch (firstError.id) {
        case 'descPlan':
          fieldName = 'nombre del mantenimiento';
          break;
        case 'tipoFrecuencia':
          fieldName = 'tipo de frecuencia';
          break;
        case 'frecuencia':
          fieldName = 'frecuencia';
          break;
        case 'vehiculosIds':
          fieldName = 'vehículos asignados';
          break;
        default:
          fieldName = firstError.id.includes('tarea') ? 'tarea' : 'campo';
      }
      this.mostrarToast(
        `Por favor, complete el ${fieldName} correctamente.`,
        'warning'
      );
    }
  }

  getFirstError(): { id: string; tab: string } | null {
    if (this.f['descPlan'].invalid)
      return { id: 'descPlan', tab: 'infoGeneral' };
    if (this.f['tipoFrecuencia'].invalid)
      return { id: 'tipoFrecuencia', tab: 'infoGeneral' };
    if (this.f['frecuencia'].invalid)
      return { id: 'frecuencia', tab: 'infoGeneral' };
    if (this.f['vehiculosIds'].invalid)
      return { id: 'vehiculosIds', tab: 'infoGeneral' };

    // Verificar tareas
    const tareas = this.tareas.controls;
    for (let i = 0; i < tareas.length; i++) {
      const tarea = tareas[i];
      if (tarea.get('nomTareaPlan')?.invalid) {
        return { id: `tarea-${i}-nombre`, tab: 'tareasPlanificacion' };
      }
      if (tarea.get('descTareaPlan')?.invalid) {
        return { id: `tarea-${i}-descripcion`, tab: 'tareasPlanificacion' };
      }
    }

    return null;
  }

  async mostrarToast(
    mensaje: string,
    color: string = 'dark',
    duracion: number = 3000
  ) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: duracion,
      color: color,
      position: 'bottom',
      buttons: [{ text: 'Cerrar', role: 'cancel' }],
    });
    toast.present();
  }

  async closeModal(data?: any) {
    await this.modalCtrl.dismiss(data);
  }
  async loadPlanificacionData() {
    if (!this.planId) return;

    const loading = await this.loadingCtrl.create({
      message: 'Cargando planificación...',
    });
    await loading.present();

    this.apiService.getPlanificacionById(this.planId).subscribe({
      next: async (data) => {
        await loading.dismiss();

        this.planForm.patchValue({
          descPlan: data.descPlan,
          frecuencia: data.frecuencia,
          fechaActivacion: data.fechaActivacion,
          tipoFrecuencia: data.tipoFrecuencia,
          esActivoPlan: data.esActivoPlan,
          esPreventivo: data.esPreventivo,
        });

        this.loadedTareas = data.tareas || [];
        this.loadedVehiculosIds =
          data.vehiculosEnPlan?.map((v) => v.idVehi) || [];

        this.cargarTareasEnFormulario();

        this.planForm.patchValue({ vehiculosIds: this.loadedVehiculosIds });

        // Guardar la fecha original para la validación
        this.fechaOriginal = data.fechaActivacion ?? undefined;
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('Error al cargar planificación:', error);
        this.mostrarToast(
          error.message || 'Error al cargar la planificación',
          'danger'
        );
      },
    });
  }

  private cargarTareasEnFormulario() {
    this.tareas.clear();

    if (this.loadedTareas.length > 0) {
      this.loadedTareas.forEach(() => {
        this.agregarTarea();
      });

      this.loadedTareas.forEach((tarea, index) => {
        const tareaControl = this.tareas.at(index);
        tareaControl.patchValue({
          nomTareaPlan: tarea.nomTareaPlan,
          descTareaPlan: tarea.descTareaPlan || '',
        });
      });
    } else {
      this.agregarTarea();
    }
  }

  onTipoFrecuenciaChange(event: any) {
    this.tipoFrecuenciaSeleccionado = event.detail?.value || null;
    if (!this.tipoFrecuenciaSeleccionado) {
      this.planForm.get('frecuencia')?.reset();
    }
  }
  // Método para cambiar entre segmentos
  segmentChanged(event: any) {
    this.selectedTab = event.detail.value;
  }

  // Función validadora personalizada para fechas
  noFechasAntiguas(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const fechaSeleccionada = new Date(control.value);
    const hoy = new Date();

    // Resetear las horas para comparar solo fechas
    fechaSeleccionada.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    // Si estamos en modo edición y la fecha no ha cambiado, permitirla
    if (this.isEditMode && this.planId) {
      // Si la fecha es la original, no validar
      if (
        this.fechaOriginal &&
        new Date(this.fechaOriginal).getTime() === fechaSeleccionada.getTime()
      ) {
        return null;
      }
    }

    if (fechaSeleccionada < hoy) {
      return { fechaAntigua: true };
    }

    return null;
  }
}
