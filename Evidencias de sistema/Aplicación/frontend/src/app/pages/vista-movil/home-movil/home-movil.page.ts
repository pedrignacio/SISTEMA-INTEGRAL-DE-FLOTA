import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
// import { FlexLayoutModule } from '@angular/flex-layout'; // Solo si lo usas en este template específico

// Importación de íconos
import { addIcons } from 'ionicons';
import {
  notificationsOutline, // Usado como 'notifications'
  personCircleOutline, // Usado como 'person-circle'
  colorPaletteOutline, // Usado como 'color-palette'
  warningOutline,      // Usado como 'warning'
  waterOutline,        // Usado como 'water'
  documentTextOutline, // Usado como 'document-text'
  cameraOutline        // Usado como 'camera'
} from 'ionicons/icons';

@Component({
  selector: 'app-home-movil',
  templateUrl: './home-movil.page.html',
  styleUrls: ['./home-movil.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    RouterLink
    // FlexLayoutModule // Solo si lo usas
  ]
})
export class HomeMovilPage implements OnInit {

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    addIcons({
      notifications: notificationsOutline,
      'person-circle': personCircleOutline,
      'color-palette': colorPaletteOutline,
      warning: warningOutline,
      water: waterOutline,
      'document-text': documentTextOutline,
      camera: cameraOutline
    });
  }

  ngOnInit() {
  }

  irACombustible(): void {
    this.router.navigate(['../combustible'], { relativeTo: this.activatedRoute });
  }

  irAIncidente(): void {
    this.router.navigate(['../incidente'], { relativeTo: this.activatedRoute });
  }
}