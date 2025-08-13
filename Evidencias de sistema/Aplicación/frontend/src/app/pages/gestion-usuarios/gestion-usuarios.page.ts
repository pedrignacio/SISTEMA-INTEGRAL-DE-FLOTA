import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ApiService, Usuario } from '../../services/api.service';
import { UsuarioFormComponent } from 'src/app/componentes/usuario-form/usuario-form.component';
import { AlertaPersonalizadaComponent } from 'src/app/componentes/alerta-personalizada/alerta-personalizada.component';
import { addIcons } from 'ionicons';
import {
  createOutline,
  trashOutline,
  add,
  refreshOutline,
  happyOutline,
  shieldCheckmarkOutline,
  briefcaseOutline,
  carSportOutline,
  buildOutline,
  constructOutline,
  personOutline,
  peopleCircleOutline,
  peopleOutline,
  checkmarkCircleOutline,
  personAddOutline,
  cloudOfflineOutline,
  arrowBack,
  arrowBackOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-gestion-usuarios',
  templateUrl: './gestion-usuarios.page.html',
  styleUrls: ['./gestion-usuarios.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class GestionUsuariosPage implements OnInit {
  public usuarios: Usuario[] = [];
  public resultadosFiltrados: Usuario[] = [];
  public cargando = true;
  public error = false;
  public skeletonItems = Array(5);
  public rolesParaFiltrar = [
    'conductor',
    'tecnico',
    'gestor',
    'admin',
    'mantenimiento',
  ];
  public selectedRole: string = 'todos';
  public selectedStatus: 'activo' | 'inactivo' = 'activo';
  constructor(
    private apiService: ApiService,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController
  ) {
    addIcons({
      createOutline,
      trashOutline,
      add,
      refreshOutline,
      happyOutline,
      shieldCheckmarkOutline,
      briefcaseOutline,
      carSportOutline,
      buildOutline,
      constructOutline,
      personOutline,
      peopleCircleOutline,
      peopleOutline,
      checkmarkCircleOutline,
      personAddOutline,
      cloudOfflineOutline,
      arrowBackOutline,
    });
  }

  ngOnInit() {}

  volver() {
    window.history.back();
  }

  ionViewWillEnter() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.cargando = true;
    this.error = false;

    const rolToFetch =
      this.selectedRole === 'todos' ? undefined : this.selectedRole;

    this.apiService.getAllUsers(rolToFetch, this.selectedStatus).subscribe({
      next: (data) => {
        this.usuarios = data;
        this.resultadosFiltrados = [...data];
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
        this.cargando = false;
        this.error = true;
        this.mostrarToast('Error al cargar la lista de usuarios.', 'danger');
      },
    });
  }

  filterByStatus(event: any) {
    this.selectedStatus = event.detail.value;
    this.cargarUsuarios();
  }

  filterByRole(event: any) {
    this.selectedRole = event.detail.value;
    this.cargarUsuarios();
  }

  handleSearch(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (!searchTerm) {
      this.resultadosFiltrados = [...this.usuarios];
      return;
    }
    this.resultadosFiltrados = this.usuarios.filter((usuario) => {
      const nombreCompleto =
        `${usuario.pri_nom_usu} ${usuario.pri_ape_usu}`.toLowerCase();
      const email = usuario.email.toLowerCase();
      return nombreCompleto.includes(searchTerm) || email.includes(searchTerm);
    });
  }
  // Método simplificado para abrir formulario (como en route-list)
  async presentUserForm(usuario: Usuario | null = null) {
    this.openUserForm(usuario, false);
  }

  // Método principal para manejar modales de usuario (siguiendo patrón de route-list)
  async openUserForm(usuario: Usuario | null, isViewMode: boolean = false) {
    console.log('Abriendo modal de usuario:', { usuario, isViewMode });

    const modal = await this.modalCtrl.create({
      component: UsuarioFormComponent,
      componentProps: {
        usuario: usuario ? { ...usuario } : null,
      },
      cssClass: 'usuario-form-modal',
      backdropDismiss: false,
      showBackdrop: true,
    });

    modal.onDidDismiss().then((result) => {
      if (result.data && result.role === 'confirm') {
        const data = result.data;
        if (usuario) {
          // Modo Edición
          this.apiService.updateUser(usuario.id_usu, data).subscribe({
            next: () => {
              this.mostrarToast('Usuario actualizado con éxito', 'success');
              this.cargarUsuarios();
            },
            error: (err) =>
              this.mostrarToast(
                err.error?.message || 'Error al actualizar',
                'danger'
              ),
          });
        } else {
          // Modo Creación
          this.apiService.createUser(data).subscribe({
            next: () => {
              this.mostrarToast('Usuario creado con éxito', 'success');
              this.selectedRole = data.rol;
              this.cargarUsuarios();
            },
            error: (err) =>
              this.mostrarToast(
                err.error?.message || 'Error al crear',
                'danger'
              ),
          });
        }
      }
    });

    return await modal.present();
  }

  // Método para ver detalles del usuario (modal de solo lectura)
  async viewUserDetail(usuario: Usuario) {
    console.log('Abriendo modal para ver detalle usuario:', usuario.id_usu);

    const modal = await this.modalCtrl.create({
      component: UsuarioFormComponent,
      componentProps: {
        usuario: { ...usuario },
        isViewMode: true,
        isEditMode: false,
      },
      cssClass: 'usuario-form-modal',
      backdropDismiss: false,
      showBackdrop: true,
    });

    modal.onDidDismiss().then((result) => {
      if (result.data && result.role === 'confirm') {
        console.log('Usuario actualizado desde vista detalle');
        this.cargarUsuarios();
      }
    });

    return await modal.present();
  }
  async onDeactivate(usuario: Usuario) {
    const modal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: 'Confirmar Desactivación',
        message: `¿Estás seguro de que quieres desactivar a <strong>${usuario.pri_nom_usu} ${usuario.pri_ape_usu}</strong>?<br><br>
                  <small>El usuario no podrá acceder al sistema hasta que sea reactivado.</small>`,
        icon: 'warning',
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'button-secondary' },
          { text: 'Desactivar', role: 'confirm', cssClass: 'button-danger' },
        ],
      },
      backdropDismiss: false,
      cssClass: 'custom-alert-modal',
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data === 'confirm') {
      this.apiService.deleteUser(usuario.id_usu).subscribe({
        next: (res) => {
          this.mostrarToast(res.message, 'success');
          this.cargarUsuarios();
        },
        error: (err) => {
          const mensaje = err?.message || 'Error al desactivar';
          this.mostrarToast(mensaje, 'danger');
        },
      });
    }
  }
  async onReactivate(usuario: Usuario) {
    const modal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: 'Confirmar Reactivación',
        message: `¿Estás seguro de que quieres reactivar a <strong>${usuario.pri_nom_usu} ${usuario.pri_ape_usu}</strong>?<br><br>
                  <small>El usuario podrá volver a acceder al sistema con sus credenciales.</small>`,
        icon: 'success',
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'button-secondary' },
          { text: 'Reactivar', role: 'confirm', cssClass: 'button-success' },
        ],
      },
      backdropDismiss: false,
      cssClass: 'custom-alert-modal',
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data === 'confirm') {
      this.apiService.reactivateUser(usuario.id_usu).subscribe({
        next: (res) => {
          this.mostrarToast(res.message, 'success');
          this.cargarUsuarios();
        },
        error: (err) => {
          const mensaje = err?.message || 'Error al reactivar';
          this.mostrarToast(mensaje, 'danger');
        },
      });
    }
  } // Método para mostrar información detallada del usuario (usa el modal personalizado)
  async showUserDetails(usuario: Usuario) {
    // Usar el modal de vista de detalles existente
    await this.viewUserDetail(usuario);
  }

  getIconForRole(rol: string): string {
    const iconMap: { [key: string]: string } = {
      admin: 'shield-checkmark-outline',
      gestor: 'briefcase-outline',
      conductor: 'car-sport-outline',
      mantenimiento: 'build-outline',
      tecnico: 'construct-outline',
    };
    return iconMap[rol] || 'person-outline';
  }

  // Métodos para obtener colores e iconos
  getColorForRole(rol: string): string {
    switch (rol) {
      case 'admin':
        return 'danger';
      case 'gestor':
        return 'warning';
      case 'tecnico':
        return 'secondary';
      case 'conductor':
        return 'tertiary';
      case 'mantenimiento':
        return 'success';
      default:
        return 'medium';
    }
  }

  getRoleChipColor(rol: string): string {
    switch (rol) {
      case 'admin':
        return 'danger';
      case 'gestor':
        return 'warning';
      case 'tecnico':
        return 'secondary';
      case 'conductor':
        return 'tertiary';
      case 'mantenimiento':
        return 'success';
      default:
        return 'medium';
    }
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color: color,
    });
    toast.present();
  }
}
