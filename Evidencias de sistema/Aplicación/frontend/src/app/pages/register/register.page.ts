import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { IonicModule, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router'; // <- 1. Importa RouterModule
import { addIcons } from 'ionicons';
// 2. Importa todos los íconos que usas en el HTML
import { idCardOutline, callOutline, mailOutline, lockClosedOutline, personOutline, settingsOutline, chevronBackOutline } from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

// Validador para asegurar que las contraseñas coincidan
export function passwordMatchValidator(controlName: string, matchingControlName: string) {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const fg = formGroup as FormGroup;
    const control = fg.get(controlName);
    const matchingControl = fg.get(matchingControlName);

    if (!control || !matchingControl) {
      return null;
    }

    if (matchingControl.errors && !matchingControl.errors['passwordMismatch']) {
      return null;
    }

    if (control.value !== matchingControl.value) {
      matchingControl.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (matchingControl.errors?.['passwordMismatch']) {
        delete matchingControl.errors['passwordMismatch'];
        if (Object.keys(matchingControl.errors).length === 0) {
          matchingControl.setErrors(null);
        }
      }
      return null;
    }
  };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    ReactiveFormsModule,
    RouterModule // <- 3. Añade RouterModule aquí
  ],
})
export class RegisterPage implements OnInit {
  public registerForm!: FormGroup; // Hecho público explícitamente por claridad
  isSubmitted = false;
  availableRoles: string[] = ['gestor', 'tecnico', 'conductor'];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {
    // 4. Registra todos los íconos necesarios
    addIcons({
      idCardOutline,
      callOutline,
      mailOutline,
      lockClosedOutline,
      personOutline,
      settingsOutline,
      chevronBackOutline
    });
  }

  ngOnInit() {
    this.registerForm = this.formBuilder.group(
      {
        pri_nom_usu: ['', [Validators.required]], // Campo requerido
        seg_nom_usu: [''], // Campo opcional
        pri_ape_usu: ['', [Validators.required]], // Campo requerido
        seg_ape_usu: [''], // Campo opcional
        email: ['', [Validators.required, Validators.email]], // Campo requerido con validación de formato
        rut_usu: ['', [Validators.required, this.rutValidator]], // Campo requerido con validación de formato
        celular: ['', [Validators.required, this.phoneValidator]], // Campo requerido con validación de formato
        rol: ['conductor', [Validators.required]], // Campo requerido
        clave: ['', [Validators.required, Validators.minLength(6)]], // Campo requerido con longitud mínima
        confirmarClave: ['', [Validators.required]], // Campo requerido
      },
      {
        validators: passwordMatchValidator('clave', 'confirmarClave'), // Validación para asegurar que las contraseñas coincidan
      }
    );
  }

  // Validador para RUT chileno
  private rutValidator(control: AbstractControl): ValidationErrors | null {
    const rut = control.value;
    if (!rut) return null;

    const rutRegex = /^[0-9]+-[0-9kK]{1}$/;
    return rutRegex.test(rut) ? null : { invalidRut: true };
  }

  // Validador para número de teléfono
  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    const phone = control.value;
    if (!phone) return null;

    const phoneRegex = /^\+56[0-9]{9}$/;
    return phoneRegex.test(phone) ? null : { invalidPhone: true };
  }

  async register() {
    this.isSubmitted = true; // Marca el formulario como enviado
    if (this.registerForm.invalid) {
      console.log('Formulario inválido:', this.registerForm.value);
      this.presentToast('Por favor, revisa los campos marcados en rojo.');
      return;
    }

    const loading = await this.loadingController.create({ message: 'Registrando...' });
    await loading.present();

    this.authService.register(this.registerForm.value).subscribe({
      next: async (res) => {
        await loading.dismiss();
        await this.presentToast('¡Usuario registrado con éxito!');
        this.router.navigateByUrl('/login', { replaceUrl: true });
      },
      error: async (error) => {
        await loading.dismiss();
        const errorMessage = error.error?.message || 'Ocurrió un error desconocido.';
        this.presentAlert('Error en el Registro', errorMessage);
      },
    });
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: 'danger'
    });
    toast.present();
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}