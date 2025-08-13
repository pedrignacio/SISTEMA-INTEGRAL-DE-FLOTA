// frontend/src/app/guards/conductor.guard.ts

import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
class ConductorGuard {
  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  canActivate(): boolean {
    const usuario = this.authService.getCurrentUser();
    
    if (usuario && usuario.rol === 'conductor') {
     
      return true;
    } else {
      
      this.presentToast('Acceso denegado. Esta sección es solo para conductores.');
      this.router.navigate(['/dashboard']); 
      return false;
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color: 'danger'
    });
    toast.present();
  }
}


export const isConductorGuard: CanActivateFn = (route, state) => {
  return inject(ConductorGuard).canActivate();
};