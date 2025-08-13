import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { isConductorGuard } from './guards/conductor.guard';
import { isTecnicoGuard } from './guards/tecnico.guard';
import { GestorGuard } from './guards/gestor.guard';
export const routes: Routes = [
  // --- Rutas Públicas ---
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'recuperar', // Ruta para la vista de recuperación de contraseña
    loadComponent: () =>
      import('./pages/recuperar/recuperar.page').then((m) => m.RecuperarPage),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password/reset-password.page').then(m => m.ResetPasswordPage),
  },
  {
    path: 'home-movil',
    loadComponent: () =>
      import('./pages/vista-movil/home-movil/home-movil.page').then(
        (m) => m.HomeMovilPage
      ),
    canActivate: [authGuard, isConductorGuard],
  },
  {
    path: 'combustible-movil',
    loadComponent: () =>
      import(
        './pages/vista-movil/combustible-movil/combustible-movil.page'
      ).then((m) => m.CombustibleMovilPage),
    canActivate: [authGuard, isConductorGuard],
  },
  {
    path: 'incidente-movil',
    loadComponent: () =>
      import('./pages/vista-movil/incidente-movil/incidente-movil.page').then(
        (m) => m.IncidenteMovilPage
      ),
    canActivate: [authGuard, isConductorGuard],
  },
  {
    path: 'servicios-tecnico-movil',
    loadComponent: () =>
      import(
        './pages/vista-movil/servicios-tecnico-movil/servicios-tecnico.page'
      ).then((m) => m.ServiciosTecnicoPage),
    canActivate: [authGuard, isTecnicoGuard],
  },
  {
    path: 'servicio-detalle-movil/:id',

    loadComponent: () =>
      import(
        './pages/vista-movil/servicio-detalle-movil/servicio-detalle.page'
      ).then((m) => m.ServicioDetallePage),
    canActivate: [authGuard, isTecnicoGuard],
  },

  {
    path: 'historial-combustible',
    loadComponent: () =>
      import(
        './pages/vista-movil/historial-combustible/historial-combustible.page'
      ).then((m) => m.HistorialCombustiblePage),
    canActivate: [authGuard, isConductorGuard],
  },
  // --- Rutas Privadas ---
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'recorridos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/recorridos/recorridos.page').then((m) => m.HomePage),
  },
  {
    path: 'rutas',
    canActivate: [authGuard],
    data: { title: 'Gestión de Rutas' },
    loadComponent: () =>
      import('./pages/route-list/route-list.page').then((m) => m.RouteListPage),
  },
  {
    path: 'rutas/nueva',
    canActivate: [authGuard],
    data: { title: 'Nueva Ruta' },
    loadComponent: () =>
      import('./pages/route-form/route-form.page').then((m) => m.RouteFormPage),
  },
  {
    path: 'rutas/edit/:id',
    canActivate: [authGuard],
    data: { title: 'Editar Ruta' },
    loadComponent: () =>
      import('./pages/route-form/route-form.page').then((m) => m.RouteFormPage),
  },
  {
    path: 'vehiculos',
    canActivate: [authGuard],
    data: { title: 'Vehículos' },
    loadComponent: () =>
      import('./pages/vehicle-list/vehicle-list.page').then(
        (m) => m.VehicleListPage
      ),
  },
  {
    path: 'vehiculos/new',
    canActivate: [authGuard],
    data: { title: 'Nuevo Vehículo' },
    loadComponent: () =>
      import('./pages/vehicle-form/vehicle-form.page').then(
        (m) => m.VehicleFormPage
      ),
  },
  {
    path: 'vehiculos/edit/:id',
    canActivate: [authGuard],
    data: { title: 'Editar Vehículo' },
    loadComponent: () =>
      import('./pages/vehicle-form/vehicle-form.page').then(
        (m) => m.VehicleFormPage
      ),
  },
  {
    path: 'route-form',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/route-form/route-form.page').then((m) => m.RouteFormPage),
  },

  {
    path: 'vehicle-form',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/vehicle-form/vehicle-form.page').then(
        (m) => m.VehicleFormPage
      ),
  },
  {
    path: 'asignacion-list',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/asignacion-list/asignacion-list.page').then(
        (m) => m.AsignacionListPage
      ),
  },
  {
    path: 'asignaciones-recorrido/nueva',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/asignacion-form/asignacion-form.page').then(
        (m) => m.AsignacionFormPage
      ),
  },
  {
    path: 'asignaciones-recorrido/editar/:idAsig',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/asignacion-form/asignacion-form.page').then(
        (m) => m.AsignacionFormPage
      ),
  },
  {
    path: 'planificacion-form',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './pages/maintenance/planificacion-form/planificacion-form.page'
      ).then((m) => m.PlanificacionFormPage),
  },
  {
    path: 'planificacion-list',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './pages/maintenance/planificacion-list/planificacion-list.page'
      ).then((m) => m.PlanificacionListPage),
  },
  {
    path: 'orden-trabajo-list',
    data: { title: 'Órdenes de Trabajo' },
    loadComponent: () =>
      import(
        './pages/maintenance/orden-trabajo-list/orden-trabajo-list.page'
      ).then((m) => m.OrdenTrabajoListPage),
  },
  {
    path: 'orden-trabajo-detalle/:id',
    data: { title: 'Detalle de OT' },
    loadComponent: () =>
      import(
        './pages/maintenance/orden-trabajo-detalle/orden-trabajo-detalle.page'
      ).then((m) => m.OrdenTrabajoDetallePage),
  },
  {
    path: 'gestion-usuarios',
    loadComponent: () =>
      import('./pages/gestion-usuarios/gestion-usuarios.page').then(
        (m) => m.GestionUsuariosPage
      ),
    canActivate: [GestorGuard],
  },

  {
    path: 'gestion-siniestros',
    loadComponent: () =>
      import('./pages/gestion-siniestros/gestion-siniestros.page').then(
        (m) => m.GestionSiniestrosPage
      ),
    canActivate: [GestorGuard], // <-- Añade el guard aquí también
  },
  {
    // --- MODIFICAR ESTA RUTA ---
    path: 'siniestro-detalle/:id', // Añadimos el parámetro :id
    loadComponent: () =>
      import('./pages/siniestro-detalle/siniestro-detalle.page').then(
        (m) => m.SiniestroDetallePage
      ),
    canActivate: [GestorGuard], // La protegemos con el mismo guard
  },
  {
    path: 'historial-vehiculo/:id', // La ruta espera el ID del vehículo
    loadComponent: () =>
      import('./pages/historial-vehiculo/historial-vehiculo.page').then(
        (m) => m.HistorialVehiculoPage
      ),
    canActivate: [authGuard, GestorGuard],
  },

  {
    path: 'siniestro-detalle/:id',
    loadComponent: () =>
      import('./pages/siniestro-detalle/siniestro-detalle.page').then(
        (m) => m.SiniestroDetallePage
      ),
    canActivate: [GestorGuard],
  },
  {
    path: 'historial-vehiculo/:id',
    loadComponent: () =>
      import('./pages/historial-vehiculo/historial-vehiculo.page').then(
        (m) => m.HistorialVehiculoPage
      ),
    canActivate: [authGuard, GestorGuard],
  },
  {
    path: 'combustible-detalle/:id',
    loadComponent: () =>
      import('./pages/combustible-detalle/combustible-detalle.page').then(
        (m) => m.CombustibleDetallePage
      ),
  },
  {
    path: 'reporte-mantenimiento',
    loadComponent: () =>
      import('./pages/reporte-mantenimiento/reporte-mantenimiento.page').then(
        (m) => m.ReporteMantenimientoPage
      ),
    canActivate: [authGuard, GestorGuard],
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
