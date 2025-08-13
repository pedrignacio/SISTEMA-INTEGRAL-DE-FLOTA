import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { addIcons } from 'ionicons';
import {
  // Navegación y acciones básicas
  arrowBack,
  arrowBackOutline,
  arrowForward,
  arrowForwardOutline,
  close,
  closeCircle,
  closeOutline,
  add,
  addCircle,
  addOutline,
  remove,
  removeCircle,
  removeOutline,
  search,
  searchOutline,
  menu,
  menuOutline,
  home,
  homeOutline,
  refresh,
  refreshOutline,

  // Estados y alertas
  checkmark,
  checkmarkCircle,
  checkmarkDoneCircle,
  checkmarkOutline,
  warning,
  warningOutline,
  alert,
  alertCircle,
  alertOutline,
  informationCircle,
  informationOutline,
  help,
  helpCircle,
  helpOutline,

  // Interacción y controles
  create,
  createOutline,
  trash,
  trashOutline,
  pencil,
  pencilOutline,
  save,
  saveOutline,
  eye,
  eyeOutline,
  eyeOff,
  eyeOffOutline,
  filter,
  filterOutline,

  // Vehículos y transporte
  car,
  carOutline,
  carSport,
  carSportOutline,
  bus,
  busOutline,
  speedometer,
  speedometerOutline,

  // Mantenimiento y herramientas
  build,
  buildOutline,
  hammer,
  hammerOutline,
  cog,
  cogOutline,
  settings,
  settingsOutline,

  // Personas y usuarios
  person,
  personOutline,
  personCircle,
  people,
  peopleOutline,
  peopleCircle,

  // Combustible y energía
  flash,
  flashOutline,
  water,
  waterOutline,
  colorFill,
  colorFillOutline,

  // Datos y estadísticas
  analytics,
  analyticsOutline,
  barChart,
  barChartOutline,
  statsChart,
  statsChartOutline,

  // Documentos y archivos
  document,
  documentOutline,
  documentText,
  documentTextOutline,
  folder,
  folderOutline,
  folderOpen,
  archive,
  archiveOutline,

  // Mapas y ubicación
  map,
  mapOutline,
  navigate,
  navigateOutline,
  navigateCircle,
  location,
  locationOutline,
  pin,
  pinOutline,

  // Tiempo y calendario
  calendar,
  calendarOutline,
  calendarClear,
  calendarNumber,
  time,
  timeOutline,
  timer,
  timerOutline,
  stopwatch,
  stopwatchOutline,

  // Comunicación
  mail,
  mailOutline,
  chatbox,
  chatboxOutline,
  call,
  callOutline,

  // Estado y progreso
  reloadCircle,
  reload,
  ban,
  banOutline,

  // Imágenes y multimedia
  image,
  imageOutline,
  camera,
  cameraOutline,

  // Misceláneos
  key,
  keyOutline,
  link,
  linkOutline,
  list,
  listOutline,
  grid,
  gridOutline,
  flag,
  flagOutline,
  exit,
  exitOutline,
  logOut,
  logOutOutline,
  logIn,
  logInOutline,
  ellipsisVertical,
  ellipsisHorizontal,
} from 'ionicons/icons';

// Registrar todos los iconos
addIcons({
  // Navegación y acciones básicas
  arrowBack,
  arrowBackOutline,
  arrowForward,
  arrowForwardOutline,
  close,
  closeCircle,
  closeOutline,
  add,
  addCircle,
  addOutline,
  remove,
  removeCircle,
  removeOutline,
  search,
  searchOutline,
  menu,
  menuOutline,
  home,
  homeOutline,
  refresh,
  refreshOutline,

  // Estados y alertas
  checkmark,
  checkmarkCircle,
  checkmarkDoneCircle,
  checkmarkOutline,
  warning,
  warningOutline,
  alert,
  alertCircle,
  alertOutline,
  informationCircle,
  informationOutline,
  help,
  helpCircle,
  helpOutline,

  // Interacción y controles
  create,
  createOutline,
  trash,
  trashOutline,
  pencil,
  pencilOutline,
  save,
  saveOutline,
  eye,
  eyeOutline,
  eyeOff,
  eyeOffOutline,
  filter,
  filterOutline,

  // Vehículos y transporte
  car,
  carOutline,
  carSport,
  carSportOutline,
  bus,
  busOutline,
  speedometer,
  speedometerOutline,

  // Mantenimiento y herramientas
  build,
  buildOutline,
  hammer,
  hammerOutline,
  cog,
  cogOutline,
  settings,
  settingsOutline,

  // Personas y usuarios
  person,
  personOutline,
  personCircle,
  people,
  peopleOutline,
  peopleCircle,

  // Combustible y energía
  flash,
  flashOutline,
  water,
  waterOutline,
  colorFill,
  colorFillOutline,

  // Datos y estadísticas
  analytics,
  analyticsOutline,
  barChart,
  barChartOutline,
  statsChart,
  statsChartOutline,

  // Documentos y archivos
  document,
  documentOutline,
  documentText,
  documentTextOutline,
  folder,
  folderOutline,
  folderOpen,
  archive,
  archiveOutline,

  // Mapas y ubicación
  map,
  mapOutline,
  navigate,
  navigateOutline,
  navigateCircle,
  location,
  locationOutline,
  pin,
  pinOutline,

  // Tiempo y calendario
  calendar,
  calendarOutline,
  calendarClear,
  calendarNumber,
  time,
  timeOutline,
  timer,
  timerOutline,
  stopwatch,
  stopwatchOutline,

  // Comunicación
  mail,
  mailOutline,
  chatbox,
  chatboxOutline,
  call,
  callOutline,

  // Estado y progreso
  reloadCircle,
  reload,
  ban,
  banOutline,

  // Imágenes y multimedia
  image,
  imageOutline,
  camera,
  cameraOutline,

  // Misceláneos
  key,
  keyOutline,
  link,
  linkOutline,
  list,
  listOutline,
  grid,
  gridOutline,
  flag,
  flagOutline,
  exit,
  exitOutline,
  logOut,
  logOutOutline,
  logIn,
  logInOutline,
  ellipsisVertical,
  ellipsisHorizontal,
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
});
