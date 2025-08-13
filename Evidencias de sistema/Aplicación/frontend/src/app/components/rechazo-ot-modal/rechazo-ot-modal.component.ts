import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, warningOutline } from 'ionicons/icons';

@Component({
  selector: 'app-rechazo-ot-modal',
  templateUrl: './rechazo-ot-modal.component.html',
  styleUrls: ['./rechazo-ot-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class RechazoOtModalComponent {
  @Input() ordenTrabajo?: any;

  motivoRechazo: string = '';
  isSubmitting: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      closeOutline,
      warningOutline,
    });
  }

  async confirmarRechazo() {
    this.isSubmitting = true;

    try {
      await this.modalCtrl.dismiss({
        rechazado: true,
        motivo: this.motivoRechazo.trim() || 'Orden deshabilitada',
      });
    } catch (error) {
      console.error('Error al confirmar rechazo:', error);
      this.mostrarToast('Error al procesar la deshabilitación', 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  async cancelar() {
    await this.modalCtrl.dismiss({
      rechazado: false,
    });
  }

  private async mostrarToast(mensaje: string, color: string = 'dark') {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom',
    });
    await toast.present();
  }
}
