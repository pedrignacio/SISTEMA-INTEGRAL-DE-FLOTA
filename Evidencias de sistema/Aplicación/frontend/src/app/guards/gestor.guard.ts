import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class GestorGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser && (currentUser.rol === 'gestor' || currentUser.rol === 'admin' || currentUser.rol === 'mantenimiento')) {
     
      return true;
    } else {
  
      this.mostrarToast('Acceso no autorizado.');
      this.router.navigate(['/dashboard']); 
      return false;
    }
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2000,
      color: 'danger',
      position: 'top'
    });
    toast.present();
  }
}