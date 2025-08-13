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
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-incidente-movil',
  templateUrl: './incidente-movil.page.html',
  styleUrls: ['./incidente-movil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
})
export class IncidenteMovilPage implements OnInit {
  incidenteForm: FormGroup;
  vehiculoAsignado: any = null;
  fotoFile: File | null = null;
  imageSrc: string | ArrayBuffer | null = null;

  isVehicleLoading = true;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private navCtrl: NavController,
    private toastController: ToastController
  ) {
    const ahora = new Date();
    this.incidenteForm = this.fb.group({
      vehiculoDisplay: [{ value: null, disabled: true }],
      vehiculoId: [null, Validators.required],
      fecha: [ahora.toISOString(), Validators.required],
      tipo: [null, Validators.required],
      descripcion: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.cargarVehiculoAsignado();
  }

  cargarVehiculoAsignado() {
    this.isVehicleLoading = true;
    const usuario = this.authService.getCurrentUser();
    if (!usuario) {
      this.presentToast('No se pudo identificar al conductor.');
      this.isVehicleLoading = false;
      return;
    }

    this.apiService.getVehiculoActivo(usuario.id_usu).subscribe({
      next: (vehiculo) => {
        if (vehiculo) {
          this.vehiculoAsignado = vehiculo;

          this.incidenteForm.patchValue({
            vehiculoId: vehiculo.idVehi,
            vehiculoDisplay: `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})`,
          });
        } else {
          this.presentToast('No tienes un vehículo asignado.');
          this.incidenteForm.disable();
        }
        this.isVehicleLoading = false;
      },
      error: () => {
        this.presentToast('Error al cargar la información del vehículo.');
        this.incidenteForm.disable();
        this.isVehicleLoading = false;
      },
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.fotoFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imageSrc = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearPhoto(fileInput: any) {
    this.imageSrc = null;
    this.fotoFile = null;
    fileInput.value = '';
  }

  async registrarIncidente() {
    if (this.incidenteForm.invalid) {
      this.presentToast('Por favor, completa todos los campos.');
      return;
    }

    const formData = new FormData();
    const usuario = this.authService.getCurrentUser();
    const formValue = this.incidenteForm.getRawValue();

    if (!usuario || !formValue.vehiculoId) {
      this.presentToast('Error de datos. No se puede registrar el incidente.');
      return;
    }

    formData.append('vehiculoId', formValue.vehiculoId);
    formData.append('conductorId', usuario.id_usu.toString());
    formData.append('fecha', formValue.fecha);
    formData.append('tipo', formValue.tipo);
    formData.append('descripcion', formValue.descripcion);

    if (this.fotoFile) {
      formData.append('fotoIncidente', this.fotoFile, this.fotoFile.name);
    }

    this.apiService.registrarIncidente(formData).subscribe({
      next: async () => {
        await this.presentToast('Incidente notificado con éxito.');
        this.navCtrl.navigateRoot('/home-movil');
      },
      error: async (err) => {
        await this.presentToast('Error al notificar el incidente.');
        console.error(err);
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
