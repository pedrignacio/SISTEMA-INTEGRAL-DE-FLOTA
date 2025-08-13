import { Component, Input } from '@angular/core'; // 1. IMPORTAMOS Input
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDownOutline, personOutline, settingsOutline, logOutOutline } from 'ionicons/icons';
import { AlertaPersonalizadaComponent, AlertButton } from '../alerta-personalizada/alerta-personalizada.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dropdown-usuario',
  templateUrl: './dropdown-usuario.component.html',
  styleUrls: ['./dropdown-usuario.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonPopover,
    IonList,
    IonItem,
    IonLabel
  ]
})
export class DropdownUsuarioComponent {
  
  
  @Input() userName: string = 'Usuario';
  @Input() userRole: string = '';

  public showPopover = false;
  public popoverEvent: Event | null = null;

  constructor(
    private modalCtrl: ModalController,
    private router: Router,
    private authService: AuthService
  ) {
    addIcons({ chevronDownOutline, personOutline, settingsOutline, logOutOutline });
  }

  openUserMenu(ev: Event): void {
    this.popoverEvent = ev;
    this.showPopover = true;
  }

  closePopover(): void {
    this.showPopover = false;
    this.popoverEvent = null;
  }

  goToProfile(): void {
    console.log('Abrir perfil de usuario');
    this.router.navigate(['/perfil']);
    this.closePopover();
  }

  openSettings(): void {
    console.log('Abrir configuración');
    this.closePopover();
  }

  logout(): void {
    this.mostrarAlertaLogout();
  }

  async mostrarAlertaLogout() {
    this.closePopover();

    const modal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: 'Confirmar cierre de sesión',
        message: '¿Estás seguro que deseas cerrar sesión?',
        icon: 'logout',
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'button-cancel' },
          { text: 'Cerrar sesión', role: 'confirm', cssClass: 'button-danger' }
        ] as AlertButton[]
      },
      cssClass: 'custom-alert-modal',
      backdropDismiss: false
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data === 'confirm') {
      console.log('Cerrando sesión...');
      this.authService.logout();
      this.mostrarAlertaExito();
    } else {
      console.log('Cierre de sesión cancelado.');
    }
  }

  async mostrarAlertaExito() {
    const modal = await this.modalCtrl.create({
      component: AlertaPersonalizadaComponent,
      componentProps: {
        title: 'Sesión cerrada',
        message: 'Su sesión fue cerrada con éxito.',
        icon: 'success',
        buttons: [{ text: 'Aceptar', role: 'accept' }] as AlertButton[]
      },
      cssClass: 'custom-alert-modal-wrapper logout-success-modal-wrapper',
      backdropDismiss: false
    });

    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    if (data === 'accept') {
      
      this.router.navigate(['/login']);
    }
  }
}
