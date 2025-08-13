import { Component, OnInit, inject } from '@angular/core'; // inject añadido
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular'; // LoadingController añadido
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Se importa AuthService
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-recuperar',
  templateUrl: './recuperar.page.html',
  styleUrls: ['./recuperar.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class RecuperarPage implements OnInit {
  recuperarForm!: FormGroup;

  // EXPLICACIÓN: Se inyectan los servicios necesarios de la manera moderna de Angular.
  private formBuilder = inject(FormBuilder);
  private toastController = inject(ToastController);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private authService = inject(AuthService); // Se inyecta el AuthService

  ngOnInit() {
    this.recuperarForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async onSubmit() {
    if (this.recuperarForm.invalid) {
      this.presentToast('Por favor, ingresa un correo electrónico válido.', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Enviando solicitud...',
    });
    await loading.present();

    const email = this.recuperarForm.get('email')?.value;

    // EXPLICACIÓN: Ahora se usa la función del servicio, que maneja la URL correcta y los errores.
    this.authService.recoverPassword(email).subscribe({
      next: async (response) => {
        await loading.dismiss();
        await this.presentToast(response.message, 'success');
        this.router.navigate(['/login']);
      },
      error: async (error: HttpErrorResponse) => {
        await loading.dismiss();
        // El handleError de tu servicio ya debería proveer un mensaje amigable.
        const message = error.error?.message || 'Error al enviar el correo. Intenta nuevamente.';
        this.presentToast(message, 'danger');
      }
    });
  }

  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color: color,
    });
    await toast.present();
  }
}