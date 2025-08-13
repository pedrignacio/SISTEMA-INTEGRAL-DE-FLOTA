// src/app/guards/auth.guard.ts
import { inject } from '@angular/core'; // Necesario para inyección en funciones
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Nuestro servicio


export const authGuard: CanActivateFn = (route, state) => {
  
  const authService = inject(AuthService);
  const router = inject(Router);


  if (authService.isAuthenticated()) {
    
    return true;
  } else {
  
    console.log('AuthGuard: Usuario no autenticado, redirigiendo a /login');
   
    router.navigateByUrl('/login');
    
    return false;
  }
};