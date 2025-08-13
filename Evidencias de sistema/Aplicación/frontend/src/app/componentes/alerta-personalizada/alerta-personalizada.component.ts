import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { warningOutline, checkmarkCircleOutline, closeCircleOutline, helpCircleOutline, informationCircleOutline, logOutOutline } from 'ionicons/icons'; // Añadido logOutOutline

// Define una interfaz para los botones
export interface AlertButton {
  text: string;
  role?: 'confirm' | 'cancel' | string; // Roles predefinidos o personalizados
  cssClass?: string; // Clases CSS para estilizar
}

@Component({
  selector: 'app-alerta-personalizada',
  templateUrl: './alerta-personalizada.component.html',
  styleUrls: ['./alerta-personalizada.component.scss'],
  standalone: true, // Asegúrate de que sea standalone
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonButton
  ]
})
export class AlertaPersonalizadaComponent implements OnInit {

  @Input() title: string = 'Alerta'; // Título por defecto
  @Input() message: string = ''; // Mensaje
  @Input() icon?: 'warning' | 'success' | 'error' | 'info' | 'help' | 'logout'; // Añadido 'logout'
  @Input() buttons: AlertButton[] = [{ text: 'Aceptar', role: 'confirm' }]; // Botón por defecto

  iconName: string = ''; // Nombre del icono de Ionicons

  constructor(private modalCtrl: ModalController) {
    // Registra los iconos que podrías usar
    addIcons({ warningOutline, checkmarkCircleOutline, closeCircleOutline, helpCircleOutline, informationCircleOutline, logOutOutline });
  }

  ngOnInit() {
    // Mapea el tipo de icono a un nombre de icono de Ionicons
    switch (this.icon) {
      case 'warning':
        this.iconName = 'warning-outline';
        break;
      case 'success':
        this.iconName = 'checkmark-circle-outline';
        break;
      case 'error':
        this.iconName = 'close-circle-outline';
        break;
      case 'info':
        this.iconName = 'information-circle-outline';
        break;
      case 'help':
        this.iconName = 'help-circle-outline';
        break;
      case 'logout':
        this.iconName = 'log-out-outline';
        break;
      default:
        this.iconName = ''; // Sin icono si no se especifica o no coincide
    }
  }

  // Método para manejar el clic en un botón
  handleButtonClick(button: AlertButton) {
    // Cierra el modal y devuelve el 'role' del botón presionado
    this.modalCtrl.dismiss(button.role);
  }

  // Método opcional para cerrar si se hace clic fuera (si el backdrop está habilitado)
  dismissModal() {
    this.modalCtrl.dismiss('backdrop'); // Devuelve 'backdrop' o null
  }
}
