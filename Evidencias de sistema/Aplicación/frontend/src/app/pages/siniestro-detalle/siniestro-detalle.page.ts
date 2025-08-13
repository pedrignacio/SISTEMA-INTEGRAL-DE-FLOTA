import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  Input,
} from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { IonicModule, ToastController, ModalController, AlertController } from '@ionic/angular'; 
import { FormsModule } from '@angular/forms'; // <--- AÑADE ESTA LÍNEA
import { ApiService, Siniestro } from '../../services/api.service'; 
import { AlertaPersonalizadaComponent } from '../../componentes/alerta-personalizada/alerta-personalizada.component';
import { addIcons } from 'ionicons'; 
import { 
  createOutline, closeOutline, timeOutline, personOutline, carOutline, flagOutline, 
  documentTextOutline, cameraReverseOutline, settingsOutline, 
  checkmarkCircleOutline, playCircleOutline, analyticsOutline, trashOutline, eyeOutline,
  saveOutline, pencilOutline 
} from 'ionicons/icons'; 

@Component({
  selector: 'app-siniestro-detalle',
  templateUrl: './siniestro-detalle.page.html',
  styleUrls: ['./siniestro-detalle.page.scss'],
  standalone: true,
  // AÑADE FormsModule a los imports
  imports: [IonicModule, CommonModule, DatePipe, TitleCasePipe, FormsModule], // <--- AÑADE FormsModule AQUÍ
})
export class SiniestroDetallePage implements OnInit {
  @Input() siniestroId!: number;

  public siniestro: Siniestro | null = null;
  public cargando = true;
  public readonly apiUrl = 'http://localhost:8101';
  public isEditingDescription: boolean = false; 
  public editingDescription: string | null = null; 

  private apiService = inject(ApiService);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController); 
  private alertCtrl = inject(AlertController); 
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    addIcons({
      createOutline, closeOutline, timeOutline, personOutline, carOutline,
      flagOutline, documentTextOutline, cameraReverseOutline, settingsOutline,
      checkmarkCircleOutline, playCircleOutline, analyticsOutline, trashOutline, eyeOutline,
      saveOutline, pencilOutline 
    });
  }

  ngOnInit() {
    this.cargarDetalleSiniestro();
  }

  cargarDetalleSiniestro() {
    this.cargando = true;

    if (!this.siniestroId) {
      this.mostrarToast('ID de siniestro no proporcionado.', 'danger');
      this.closeModal();
      return;
    }

    this.apiService.getSiniestroById(this.siniestroId).subscribe({
      next: (data: Siniestro) => { 
        this.siniestro = data;
        this.editingDescription = data.descripcion; 
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => { 
        this.cargando = false;
        console.error('Error al cargar el detalle del siniestro:', err);
        this.mostrarToast(
          err.message || 'No se pudo cargar la información del incidente.', 
          'danger'
        );
        this.closeModal();
      },
    });
  }

  async actualizarEstado() {
    if (!this.siniestro) {
        this.mostrarToast('No hay siniestro cargado para actualizar.', 'warning');
        return;
    }

    const estadosPosibles = [
        'reportado',
        'en_revision', 
        'resuelto', 
        'cancelado'
    ];

    const inputs = estadosPosibles.map(estado => ({
        name: 'estadoRadio',
        type: 'radio' as const, 
        label: estado.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        value: estado,
        checked: this.siniestro?.estado === estado 
    }));

    const alert = await this.alertCtrl.create({ 
        header: 'Actualizar Estado del Incidente',
        inputs: inputs, 
        buttons: [
            {
                text: 'Cancelar',
                role: 'cancel',
                cssClass: 'secondary', 
            },
            {
                text: 'Actualizar',
                handler: (nuevoEstado: string) => { 
                    if (nuevoEstado && this.siniestro) {
                        if (nuevoEstado === this.siniestro.estado) {
                            this.mostrarToast('El estado ya es el seleccionado.', 'medium');
                            return false; 
                        }

                        this.apiService.updateSiniestroStatus(this.siniestro.id, nuevoEstado).subscribe({
                            next: () => {
                                this.mostrarToast('Estado actualizado con éxito.', 'success');
                                if (this.siniestro) {
                                    this.siniestro.estado = nuevoEstado;
                                    this.cdr.detectChanges(); 
                                }
                            },
                            error: (err: any) => { 
                                console.error('Error al actualizar el estado del siniestro:', err);
                                const errorMessage = err?.message || 'Error al actualizar el estado.';
                                this.mostrarToast(errorMessage, 'danger');
                            },
                        });
                        return true; 
                    }
                    return false; 
                }
            }
        ],
    });

    await alert.present();
  }

  toggleEditDescription() {
    this.isEditingDescription = !this.isEditingDescription;
    if (this.isEditingDescription && this.siniestro) {
      this.editingDescription = this.siniestro.descripcion;
    }
    this.cdr.detectChanges(); 
  }

  async saveDescription() {
    if (!this.siniestro || this.editingDescription === null) {
      this.mostrarToast('No hay descripción para guardar.', 'warning');
      return;
    }
    
    if (this.editingDescription === this.siniestro.descripcion) {
      this.mostrarToast('La descripción no ha cambiado.', 'medium');
      this.toggleEditDescription(); 
      return;
    }

    this.apiService.updateSiniestro(this.siniestro.id, { descripcion: this.editingDescription }).subscribe({
      next: (updatedSiniestro: Siniestro) => { 
        this.siniestro!.descripcion = updatedSiniestro.descripcion; 
        this.mostrarToast('Descripción actualizada con éxito.', 'success');
        this.toggleEditDescription(); 
        this.cdr.detectChanges(); 
      },
      error: (err: any) => { 
        console.error('Error al guardar la descripción:', err);
        const errorMessage = err?.message || 'Error al guardar la descripción.';
        this.mostrarToast(errorMessage, 'danger');
      }
    });
  }

  getColorForStatus(estado: string | undefined): string {
    if (!estado) return 'light';
    switch (estado) {
      case 'reportado':
        return 'warning';
      case 'en_revision':
        return 'primary';
      case 'resuelto':
        return 'success';
      case 'cancelado':
        return 'medium';
      default:
        return 'light';
    }
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      color: color,
    });
    toast.present();
  }

  async closeModal(data?: any) {
    await this.modalCtrl.dismiss(data);
  }
}