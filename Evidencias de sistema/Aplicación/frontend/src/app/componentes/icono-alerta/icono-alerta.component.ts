import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonButton } from '@ionic/angular/standalone';
import { notificationsOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-icono-alerta',
  templateUrl: './icono-alerta.component.html',
  styleUrls: ['./icono-alerta.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon, IonButton],
})
export class IconoAlertaComponent {
  @Input() count: number = 0;

  constructor() {
    addIcons({
      notifications: notificationsOutline,
    });
  }

  // Método para determinar el color del icono según la cantidad de notificaciones
  getNotificationColor(): string {
    if (this.count === 0) return '#fff'; // Blanco si no hay notificaciones
    if (this.count < 3) return '#ffe082'; // Amarillo claro
    if (this.count < 6) return '#ff9800'; // Naranja
    if (this.count < 10) return '#ff5252'; // Rojo claro
    return '#d50000'; // Rojo fuerte
  }

  onNotificationClick(): void {
    console.log('Notificaciones clickeadas');
    // Aquí puedes abrir un modal, redirigir a otra página, etc.
  }
}