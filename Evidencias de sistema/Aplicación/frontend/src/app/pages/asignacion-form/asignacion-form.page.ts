import { Component, OnInit, inject, Input, TemplateRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import {
  IonicModule,
  LoadingController,
  ToastController,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  saveOutline,
  closeCircleOutline,
  calendarOutline,
  speedometerOutline,
  listOutline,
  peopleOutline,
  carSportOutline,
  closeOutline,
} from 'ionicons/icons';
import { AlertaPersonalizadaComponent } from 'src/app/componentes/alerta-personalizada/alerta-personalizada.component';
import {
  ApiService,
  AsignacionRecorrido,
  AsignacionRecorridoData,
  Route as RutaPlantilla,
  VehiculoAsignacionInfo,
  UsuarioConductorInfo,
} from '../../services/api.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-asignacion-form',
  templateUrl: './asignacion-form.page.html',
  styleUrls: ['./asignacion-form.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
  ],
})
export class AsignacionFormPage implements OnInit {
  @Input() asignacionId: number | null = null;
  @Input() isEditMode: boolean = false;
  @Input() isViewMode: boolean = false;

  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);

  asignacionForm!: FormGroup;
  pageTitle = 'Nueva Asignación de Recorrido';
  isLoading = true;
  isSubmitting = false;

  conductores: UsuarioConductorInfo[] = [];
  rutasPlantilla: RutaPlantilla[] = [];
  vehiculos: VehiculoAsignacionInfo[] = [];
  asignacionesActivasVehiculo: AsignacionRecorrido[] = [];
  disponibilidadVehiculo = { disponible: true, mensaje: '' };
  estadosAsignacion = [
    'pendiente',
    'asignado',
    'en_progreso',
    'completado',
    'cancelado',
  ];

  customActionSheetOptions = {
    header: 'Seleccione una ruta',
    subHeader: 'Elija la ruta que se recorrerá',
    translucent: true,
    backdropDismiss: true,
    animated: true,
    cssClass: 'custom-action-sheet',
    mode: 'ios', // o 'md' para Material Design
    buttons: [
      {
        text: 'Cerrar selector', // Texto personalizado
        role: 'cancel',
        cssClass: 'action-sheet-cancel-button',
        handler: () => {
          console.log('Usuario canceló la selección');
          // Puedes ejecutar código adicional cuando se cancela
        },
      },
    ],
  };

  constructor() {
    addIcons({
      saveOutline,
      closeCircleOutline,
      calendarOutline,
      speedometerOutline,
      listOutline,
      peopleOutline,
      carSportOutline,
      closeOutline,
    });
  }

  ngOnInit() {
    this.updatePageTitle();
    this.initForm();
    this.loadInitialData();
  }

  updatePageTitle() {
    if (this.isViewMode) this.pageTitle = 'Ver Asignación de Recorrido';
    else if (this.isEditMode) this.pageTitle = 'Editar Asignación de Recorrido';
    else this.pageTitle = 'Nueva Asignación de Recorrido';
  }

  initForm() {
    // Corregimos la advertencia de [disabled] declarándolo aquí directamente
    const formState = { value: null, disabled: this.isViewMode };
    this.asignacionForm = this.fb.group({
      usuarioIdUsu: [formState, Validators.required],
      rutaIdRuta: [formState, Validators.required],
      vehiculoIdVehi: [formState, Validators.required],
      fecIniRecor: [
        { value: new Date().toISOString(), disabled: this.isViewMode },
        Validators.required,
      ],
      fecFinRecor: [formState],
      kmIniRecor: [formState, [Validators.required, Validators.min(0)]],
      kmFinRecor: [formState, [Validators.min(0)]],
      estadoAsig: [
        { value: 'asignado', disabled: this.isViewMode },
        Validators.required,
      ],
      notas: [formState],
      efiCombRecor: [formState],
    });
  }

  async loadInitialData() {
    this.isLoading = true;
    const conductores$ = this.apiService.getUsuarios({
      rol: 'conductor',
    });
    const rutas$ = this.apiService.getRoutes();
    const vehiculos$ = this.apiService.getVehicles(); // Sin filtro
    console.log(this.apiService.getUsuarios({ rol: 'conductor' }));

    forkJoin([conductores$, rutas$, vehiculos$]).subscribe({
      next: ([conductoresData, rutasData, vehiculosData]) => {
        this.conductores = conductoresData;
        this.rutasPlantilla = rutasData;
        this.vehiculos = vehiculosData.map((v) => ({
          idVehi: v.idVehi || 0,
          patente: v.patente,
          modelo: v.modelo,
          marca: v.marca,
          estadoVehi: v.estadoVehi,
        }));
        console.log(this.conductores);

        if (this.asignacionId) {
          this.loadAsignacionData();
          console.log(this.conductores);
        } else {
          this.isLoading = false;
          console.log(this.conductores);
        }
      },
      error: async (error) => {
        this.isLoading = false;
        await this.showErrorAlert(
          'Error al Cargar Datos',
          error.message ||
            'No se pudieron obtener los datos para el formulario.'
        );
        this.closeModal();
      },
    });
  }

  async loadAsignacionData() {
    if (!this.asignacionId) {
      this.isLoading = false;
      return;
    }

    this.apiService.getAsignacionRecorrido(this.asignacionId).subscribe({
      next: (asignacion) => {
        // Verificar si la asignación está en un estado que no permite edición
        if (this.isEditMode && !this.isViewMode) {
          const estado = asignacion.estadoAsig || '';
          if (estado === 'en_progreso' || estado === 'completado') {
            this.isLoading = false;
            this.showErrorAlert(
              'Edición no permitida',
              `No se pueden modificar recorridos en estado "${this.getEstadoDisplay(
                estado
              )}".`
            );
            this.closeModal();
            return;
          }
        }

        // Continuar con la carga de datos si la edición es permitida
        this.asignacionForm.patchValue({
          ...asignacion,
          usuarioIdUsu: asignacion.conductor?.idUsu || null,
          fecIniRecor: asignacion.fecIniRecor
            ? new Date(asignacion.fecIniRecor).toISOString()
            : null,
          fecFinRecor: asignacion.fecFinRecor
            ? new Date(asignacion.fecFinRecor).toISOString()
            : null,
        });
        console.log('Asignación cargada:', asignacion);
        this.isLoading = false;
      },
      error: async (error) => {
        this.isLoading = false;
        await this.showErrorAlert(
          'Error al cargar la asignación',
          error.message || 'No se pudo cargar la información.'
        );
        this.closeModal();
      },
    });
  }
  onVehiculoChange(event: any) {
    const vehiculoId = event.detail.value;

    // Si el usuario deselecciona el vehículo, limpiamos la lista de asignaciones.
    if (!vehiculoId) {
      this.asignacionesActivasVehiculo = [];
      return;
    }

    // 1. Obtener kilometraje y eficiencia de combustible
    if (!this.isEditMode) {
      this.apiService.getVehicle(vehiculoId).subscribe({
        next: (veh) => {
          if (veh?.kmVehi) {
            this.asignacionForm.patchValue({ kmIniRecor: veh.kmVehi });

            // Establecer la eficiencia de combustible del vehículo o el valor por defecto de 5
            const eficiencia = veh.efiComb || 5;
            this.asignacionForm.patchValue({ efiCombRecor: eficiencia });

            // Actualizar kilometraje final si ya se seleccionó una ruta
            this.calcularKilometrajeFinal();
          }
        },
      });
    }

    // 2. Obtener asignaciones activas del vehículo (lógica nueva)
    this.apiService.getVehiculoAsignacionesActivas(vehiculoId).subscribe({
      next: (asignaciones) => {
        this.asignacionesActivasVehiculo = asignaciones;
      },
      error: (err) => {
        // Por si falla la llamada, mostramos un aviso y limpiamos la lista.
        this.presentToast(
          'No se pudieron cargar las asignaciones del vehículo.',
          'danger'
        );
        this.asignacionesActivasVehiculo = [];
      },
    });
  }

  // Nuevo método para calcular el kilometraje final
  private calcularKilometrajeFinal() {
    const kmInicial = this.asignacionForm.get('kmIniRecor')?.value;
    const rutaId = this.asignacionForm.get('rutaIdRuta')?.value;

    if (kmInicial && rutaId) {
      // Buscar la ruta seleccionada
      const rutaSeleccionada = this.rutasPlantilla.find(
        (ruta) => ruta.idRuta === rutaId
      );

      if (rutaSeleccionada && rutaSeleccionada.kilometrosRuta) {
        // Calcular el km final sumando el inicial más los km de la ruta
        const kmFinal =
          Number(kmInicial) + Number(rutaSeleccionada.kilometrosRuta);
        this.asignacionForm.patchValue({
          kmFinRecor: Number(kmFinal.toFixed(1)),
        });
      }
    }
  }

  // Método para cuando cambia la ruta seleccionada
  onRutaChange(event: any) {
    this.calcularKilometrajeFinal();
  }

  async submitForm() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.asignacionForm.markAllAsTouched();

    // Agregamos un console.log para depuración
    console.log('=== DATOS DEL FORMULARIO DE ASIGNACIÓN ===');
    console.log('Form Values:', this.asignacionForm.getRawValue());
    console.log('Form Valid:', this.asignacionForm.valid);
    console.log('Form Errors:', this.getFormValidationErrors());
    console.log('=======================================');

    // Si el formulario no es válido, mostramos un mensaje y salimos
    if (!this.asignacionForm.valid) {
      this.presentToast(
        'Hay campos incompletos o con errores. Por favor, revisa el formulario.',
        'warning'
      );
      this.isSubmitting = false;
      return;
    }

    const confirm = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: this.isEditMode ? 'Confirmar Edición' : 'Confirmar Creación',
        message: '¿Estás seguro de continuar con esta operación?',
        icon: this.isEditMode ? 'warning' : 'info',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: this.isEditMode ? 'Actualizar' : 'Crear', role: 'confirm' },
        ],
      },
      backdropDismiss: false,
      cssClass: 'custom-alert-modal',
    });

    await confirm.present();
    const { data } = await confirm.onDidDismiss();

    if (data !== 'confirm') {
      this.isSubmitting = false;
      return;
    }

    // --- LÓGICA DE CARGA MANUAL Y ROBUSTA ---
    const loading = await this.loadingCtrl.create({
      message: this.isEditMode
        ? 'Actualizando asignación...'
        : 'Creando asignación...',
    });
    await loading.present();

    try {
      const formData = this.asignacionForm.getRawValue();
      const asignacionData = this.prepareDataForApi(formData);

      const operation$ =
        this.isEditMode && this.asignacionId
          ? this.apiService.updateAsignacionRecorrido(
              this.asignacionId,
              asignacionData
            )
          : this.apiService.createAsignacionRecorrido(asignacionData);

      await operation$.toPromise();

      await loading.dismiss();
      this.presentToast(
        `Asignación ${this.isEditMode ? 'actualizada' : 'creada'} con éxito.`,
        'success'
      );
      this.closeModal(true);
    } catch (error: any) {
      await loading.dismiss(); // Nos aseguramos de cerrar el loading incluso si hay error
      this.presentToast(
        error.message || 'No se pudo guardar la asignación.',
        'danger'
      );
    } finally {
      // Este bloque se ejecutará siempre, tanto si hay éxito como si hay error.
      this.isSubmitting = false;
    }
  }

  private prepareDataForApi(formData: any): AsignacionRecorridoData {
    let usuarioId = formData.usuarioIdUsu;
    if (typeof usuarioId === 'string') {
      // Si es una cadena, intentar convertirla a número y eliminar espacios
      usuarioId = parseInt(usuarioId.trim(), 10);
      if (isNaN(usuarioId)) {
        // Si no es un número, buscar el ID por nombre
        const conductorEncontrado = this.conductores.find(
          (c) =>
            `${c.pri_nom_usu} ${c.pri_ape_usu}`.trim() ===
            formData.usuarioIdUsu.trim()
        );
        usuarioId = conductorEncontrado ? conductorEncontrado.idUsu : null;
      }
    }

    const kmIniRecorNum = Number(formData.kmIniRecor);
    if (isNaN(kmIniRecorNum))
      throw new Error('El kilometraje inicial es inválido.');

    const kmFinRecorNum = formData.kmFinRecor
      ? Number(formData.kmFinRecor)
      : null;
    if (kmFinRecorNum !== null) {
      if (isNaN(kmFinRecorNum))
        throw new Error('El kilometraje final no es válido.');
      // Eliminada la validación que exige que el KM final sea mayor al inicial
    } else if (formData.estadoAsig === 'completado' && !this.isEditMode) {
      // Solo validamos esto en creación, no en edición, permitiendo completar sin KM finales
      throw new Error(
        'El kilometraje final es requerido para completar la asignación.'
      );
    }

    const data: AsignacionRecorridoData = {
      usuarioIdUsu: parseInt(formData.usuarioIdUsu, 10),
      rutaIdRuta: parseInt(formData.rutaIdRuta, 10),
      vehiculoIdVehi: parseInt(formData.vehiculoIdVehi, 10),
      fecIniRecor: new Date(formData.fecIniRecor).toISOString(),
      fecFinRecor: formData.fecFinRecor
        ? new Date(formData.fecFinRecor).toISOString()
        : null,
      kmIniRecor: kmIniRecorNum,
      kmFinRecor: kmFinRecorNum,
      estadoAsig: formData.estadoAsig,
      notas: formData.notas,
      efiCombRecor: formData.efiCombRecor
        ? Number(formData.efiCombRecor)
        : null,
    };

    if (
      data.fecFinRecor &&
      new Date(data.fecFinRecor) <= new Date(data.fecIniRecor)
    ) {
      throw new Error(
        'La fecha de fin debe ser posterior a la fecha de inicio.'
      );
    }
    return data;
  }

  async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger' = 'success',
    duration: number = 3000
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom',
    });
    toast.present();
  }

  async showErrorAlert(title: string, message: string) {
    const alert = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title,
        message,
        icon: 'error',
        buttons: [{ text: 'Aceptar', role: 'confirm' }],
      },
      cssClass: 'custom-alert-modal',
    });
    await alert.present();
  }

  async closeModal(dataChanged: boolean = false) {
    await this.modalCtrl.dismiss({ dataChanged });
  }

  get f() {
    return this.asignacionForm.controls;
  }

  // Método auxiliar para obtener todos los errores del formulario (añadir esto también)
  private getFormValidationErrors() {
    const errors: any = {};
    Object.keys(this.asignacionForm.controls).forEach((key) => {
      const control = this.asignacionForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  // Método auxiliar para mostrar el estado de forma legible
  private getEstadoDisplay(estado: string): string {
    switch (estado) {
      case 'en_progreso':
        return 'En Progreso';
      case 'completado':
        return 'Completado';
      case 'cancelado':
        return 'Cancelado';
      case 'asignado':
        return 'Asignado';
      default:
        return estado.charAt(0).toUpperCase() + estado.slice(1);
    }
  }
}
