// Fichero: src/app/pages/combustible-detalle/combustible-detalle.page.ts

import { Component, OnInit, inject, Input } from '@angular/core';
import {
  CommonModule,
  CurrencyPipe,
  DatePipe,
  TitleCasePipe,
} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-combustible-detalle',
  templateUrl: './combustible-detalle.page.html',
  styleUrls: ['./combustible-detalle.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    DatePipe,
    CurrencyPipe,
    TitleCasePipe,
  ],
})
export class CombustibleDetallePage implements OnInit {
  @Input() registroId!: number;

  registro: any = null;
  isLoading = true;
  pageTitle = 'Detalle de Combustible';
  public readonly apiUrl = 'http://localhost:8101';

  private apiService = inject(ApiService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  ngOnInit() {
    this.cargarRegistro();
  }

  cargarRegistro() {
    console.log(
      'Intentando cargar registro con ID:',
      this.registroId,
      'tipo:',
      typeof this.registroId
    );

    if (!this.registroId) {
      console.error('ID de registro no proporcionado');
      this.mostrarToast(
        'No se pudo cargar el registro: ID no proporcionado',
        'danger'
      );
      this.closeModal();
      return;
    }

    this.isLoading = true;
    this.apiService.getCombustibleById(this.registroId).subscribe({
      next: (data) => {
        console.log('Datos recibidos del API:', data);
        if (!data) {
          console.error('API devolvió datos vacíos');
          this.mostrarToast('No se encontró el registro solicitado', 'warning');
          this.closeModal();
          return;
        }

        this.registro = data;
        this.isLoading = false;

        // Usar ID de forma más flexible
        const registroId = data.id || data.idReg || data.id_reg;
        this.pageTitle = registroId
          ? `Registro #${registroId}`
          : 'Detalle de Combustible';
      },
      error: (err) => {
        console.error('Error cargando registro:', err);
        this.isLoading = false;
        this.mostrarToast(
          `Error al cargar el registro: ${err.status} - ${
            err.message || 'Error desconocido'
          }`,
          'danger'
        );
        this.closeModal();
      },
    });
  }

  async closeModal(data?: any) {
    await this.modalCtrl.dismiss(data);
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom',
    });
    toast.present();
  }
  async verImagenCompleta(imageUrl: string) {
    // Abrir la imagen en una nueva ventana/pestaña
    window.open(imageUrl, '_blank');
  }
}
