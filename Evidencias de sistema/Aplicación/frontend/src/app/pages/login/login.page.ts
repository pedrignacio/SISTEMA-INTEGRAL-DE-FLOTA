import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, LoadingController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, logInOutline } from 'ionicons/icons';
import { AuthService, LoginResponse } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
})
export class LoginPage implements OnInit {
  loginForm!: FormGroup;
  isSubmitted = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {

    addIcons({
      mailOutline,
      lockClosedOutline,
      logInOutline, 
    });
  }

  ngOnInit() {
   
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      clave: ['', [Validators.required]], 
    });
  }

 
  get email() {
    return this.loginForm.get('email');
  }
  get clave() {
    return this.loginForm.get('clave');
  }
  
   async login() {
    this.isSubmitted = true;

    if (this.loginForm.invalid) {
      console.log('Formulario de login inválido');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...',
    });
    await loading.present();

   
    this.authService.login(this.loginForm.value).subscribe({
    
      next: async (response: LoginResponse) => {
        await loading.dismiss();
        console.log('Login exitoso!', response);
        
       
        const userRole = response.user.rol;

       
        if (userRole === 'conductor') {
          this.router.navigateByUrl('/home-movil', { replaceUrl: true });
        } else if (userRole === 'tecnico') {
          this.router.navigateByUrl('/servicios-tecnico-movil', { replaceUrl: true });
        } else {
        
          this.router.navigateByUrl('/dashboard', { replaceUrl: true });
        }
      },
      
      error: async (error) => {
        await loading.dismiss();
        console.error('Error en el login:', error);
        const alert = await this.alertController.create({
          header: 'Error de Inicio de Sesión',
          message: error.message || 'Ocurrió un error desconocido.',
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  // Método para redirigir a la vista de recuperación de contraseña
  goToRecuperar() {
    this.router.navigate(['/recuperar']);
  }
}
