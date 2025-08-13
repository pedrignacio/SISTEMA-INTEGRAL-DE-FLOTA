import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Se importa AuthService
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule, CommonModule],
})
export class ResetPasswordPage implements OnInit {
  resetForm!: FormGroup;
  private token: string | null = null;

  // EXPLICACIÓN: Se inyectan los servicios necesarios.
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private authService = inject(AuthService); // Se inyecta AuthService

  ngOnInit() {
    // Se obtiene el token de la URL de forma segura.
    this.token = this.route.snapshot.queryParamMap.get('token');

    this.resetForm = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, {
      // Se añade un validador para que las contraseñas coincidan.
      validators: this.passwordMatchValidator
    });
  }

  // Validador personalizado
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else {
      confirmPassword?.setErrors(null);
    }
    return null;
  }

  async onSubmit() {
    if (this.resetForm.invalid) {
      this.presentToast('Por favor, completa el formulario correctamente.', 'danger');
      return;
    }

    if (!this.token) {
      this.presentToast('Token de recuperación inválido o ausente.', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Actualizando contraseña...',
    });
    await loading.present();

    const newPassword = this.resetForm.get('password')?.value;

    // EXPLICACIÓN: Ahora se usa la función del servicio.
    this.authService.resetPassword(this.token, newPassword).subscribe({
      next: async (response) => {
        await loading.dismiss();
        await this.presentToast(response.message, 'success');
        this.router.navigate(['/login']);
      },
      error: async (error: HttpErrorResponse) => {
        await loading.dismiss();
        const message = error.error?.message || 'Error al restablecer la contraseña. El token puede ser inválido o haber expirado.';
        this.presentToast(message, 'danger');
      }
    });
  }

  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color,
    });
    await toast.present();
  }
}