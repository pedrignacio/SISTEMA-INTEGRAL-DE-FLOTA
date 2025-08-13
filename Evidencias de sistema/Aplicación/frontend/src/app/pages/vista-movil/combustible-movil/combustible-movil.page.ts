import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-combustible-movil',
  templateUrl: './combustible-movil.page.html',
  styleUrls: ['./combustible-movil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
})
export class CombustibleMovilPage implements OnInit {
  combustibleForm: FormGroup;
  vehiculos: any[] = [];
  comprobanteFile: File | null = null;
  imageSrc: string | ArrayBuffer | null = null;
  isImageLoading: boolean = false;
  selectedFileName: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private toastController: ToastController,
    private navCtrl: NavController
  ) {
    this.combustibleForm = this.fb.group({
      vehiculoId: [null, Validators.required],

      tipoCombustible: [null, Validators.required],
      fecha: [new Date().toISOString(), Validators.required],
      monto: [null, [Validators.required, Validators.min(1)]],
      litros: [null, [Validators.required, Validators.min(0.1)]],
      kilometraje: [null, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit() {
    this.cargarVehiculoAsignado();
  }

  cargarVehiculoAsignado() {
    const usuario = this.authService.getCurrentUser();
    if (!usuario) {
      this.presentToast('No se pudo identificar al conductor.');
      return;
    }

    console.log('Usuario actual:', usuario.id_usu);

    console.log('ID del conductor:', usuario.id_usu);

    this.apiService.getVehiculoActivo(usuario.id_usu).subscribe({
      next: (vehiculoAsignado: any) => {
        if (vehiculoAsignado) {
          this.vehiculos = [vehiculoAsignado];

          this.combustibleForm.patchValue({
            vehiculoId: vehiculoAsignado.idVehi,
            tipoCombustible: vehiculoAsignado.tipoCombustible,
            fecha: new Date().toISOString(),
            monto: null,
            litros: null,
            kilometraje: null,
          });

          this.combustibleForm.get('vehiculoId')?.disable();
        } else {
          this.presentToast('No tienes un vehículo asignado actualmente.');
          this.combustibleForm.disable();
        }
      },
      error: (err) => {
        if (err.status === 404) {
          this.presentToast(
            'No tienes un vehículo con recorrido "en progreso" asignado.'
          );
        } else {
          this.presentToast('Error al cargar la información del vehículo.');
        }
        this.combustibleForm.disable();
      },
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.isImageLoading = true;
      this.selectedFileName = file.name;
      this.comprobanteFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imageSrc = reader.result;
        this.isImageLoading = false;
      };
      reader.readAsDataURL(file);
    }
  }

  async registrarCarga() {
    if (this.combustibleForm.invalid && this.combustibleForm.enabled) {
      this.presentToast('Por favor, completa todos los campos requeridos.');
      return;
    }

    const formValue = this.combustibleForm.getRawValue();
    const formData = new FormData();
    const usuario = this.authService.getCurrentUser();

    if (!usuario) {
      this.presentToast('Error de autenticación.');
      return;
    }

    // Obtener el ID del usuario correctamente
    const usuarioId = usuario.id_usu || usuario.idUsu;

    if (!usuarioId) {
      console.error('No se pudo obtener el ID del usuario', usuario);
      this.presentToast('Error: No se pudo identificar al usuario.');
      return;
    }

    formData.append('vehiculoId', formValue.vehiculoId);
    formData.append('usuarioId', usuarioId.toString()); // Usar el ID del usuario actual
    formData.append('fecha', formValue.fecha);
    formData.append('monto', formValue.monto);
    formData.append('litros', formValue.litros);
    formData.append('kilometraje', formValue.kilometraje);
    formData.append('tipoCombustible', formValue.tipoCombustible);

    if (this.comprobanteFile) {
      formData.append(
        'comprobante',
        this.comprobanteFile,
        this.comprobanteFile.name
      );
    }

    this.apiService.registrarCargaCombustible(formData).subscribe({
      next: async (response) => {
        console.log('Registro de combustible guardado con éxito:', response);
        await this.presentToast('Carga de combustible registrada con éxito.');
        this.navCtrl.navigateRoot('/home-movil', {
          animated: true,
          animationDirection: 'back',
        });
      },
      error: async (error) => {
        console.error('Error al registrar la carga:', error);
        await this.presentToast('Error al registrar la carga.');
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
}
