// frontend/src/app/guards/tecnico.guard.ts

import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
class TecnicoGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    const usuario = this.authService.getCurrentUser();
    // Permitir acceso si el rol es 'tecnico' O 'mantenimiento' (rol de gestor)
    if (usuario && (usuario.rol === 'tecnico' || usuario.rol === 'mantenimiento')) {
      return true;
    } else {
      this.router.navigate(['/dashboard']);
      return false;
    }
  }
}

export const isTecnicoGuard: CanActivateFn = (route, state) => {
  return inject(TecnicoGuard).canActivate();
};