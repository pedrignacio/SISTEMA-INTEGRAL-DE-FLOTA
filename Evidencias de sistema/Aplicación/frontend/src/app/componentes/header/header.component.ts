import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonMenuToggle,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  personCircleOutline,
  personOutline,
} from 'ionicons/icons';
import { DropdownUsuarioComponent } from '../dropdown-usuario/dropdown-usuario.component';
import { IconoAlertaComponent } from '../icono-alerta/icono-alerta.component';
import { AuthService, UserInfo } from 'src/app/services/auth.service';
import { TitleService } from 'src/app/services/title.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonIcon,
    IonMenuToggle,
    DropdownUsuarioComponent,
  ],
})
export class HeaderComponent implements OnInit {
  currentUser: UserInfo | null = null;
  currentTitle$: Observable<string>;
  notificationCount: number = 5;
  isMobile: boolean = false;

  constructor(
    private authService: AuthService,
    private titleService: TitleService
  ) {
    addIcons({ menuOutline, personCircleOutline, personOutline });
    this.currentTitle$ = this.titleService.title$;
    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
  }
}
