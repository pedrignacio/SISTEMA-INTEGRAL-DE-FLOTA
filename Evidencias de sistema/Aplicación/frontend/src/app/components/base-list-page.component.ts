import { Component, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import {
  IonItemSliding,
  ToastController,
  LoadingController,
  ModalController,
} from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { BaseListService, FilterConfig } from '../services/base-list.service';
import { TitleService } from '../services/title.service';

@Component({
  template: '',
})
export abstract class BaseListPageComponent<T> implements OnDestroy {
  @ViewChildren(IonItemSliding) slidingItems!: QueryList<IonItemSliding>;

  private destroy$ = new Subject<void>();

  // Propiedades compartidas
  isLoading = false;
  Math = Math; // Para usar Math en el template

  constructor(
    protected baseListService: BaseListService<T>,
    protected toastCtrl: ToastController,
    protected loadingCtrl: LoadingController,
    protected modalCtrl: ModalController,
    protected titleService: TitleService
  ) {}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Configuración abstracta que cada página debe implementar
  abstract getFilterConfig(): FilterConfig<T>;
  abstract getPageTitle(): string;
  abstract loadData(): Promise<T[]>;

  async ngOnInit() {
    this.titleService.setTitle(this.getPageTitle());
  }

  ionViewWillEnter() {
    this.loadItems();
  }

  async loadItems(event?: any) {
    this.isLoading = true;
    let loadingIndicator: HTMLIonLoadingElement | undefined;

    if (!event) {
      loadingIndicator = await this.loadingCtrl.create({
        message: 'Cargando...',
      });
      await loadingIndicator.present();
    }
    try {
      const data = await this.loadData();

      // Verificar que data sea un array válido antes de proceder
      if (!Array.isArray(data)) {
        console.warn(
          'loadData() no retornó un array válido. Tipo recibido:',
          typeof data,
          'Valor:',
          data
        );
        this.baseListService.setItems([]);
      } else {
        this.baseListService.setItems(data);
      }

      this.baseListService.applyFilters(this.getFilterConfig());

      this.isLoading = false;
      loadingIndicator?.dismiss();
      event?.target?.complete();
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.isLoading = false;
      loadingIndicator?.dismiss();
      event?.target?.complete();
      this.mostrarToast('Error al cargar los datos.', 'danger');
    }
  }

  // Getters para acceder al servicio base
  get searchTerm() {
    return this.baseListService.searchTerm;
  }

  set searchTerm(value: string) {
    this.baseListService.searchTerm = value;
  }

  get currentPage() {
    return this.baseListService.currentPage;
  }

  get totalPages() {
    return this.baseListService.totalPages;
  }

  get totalFilteredItems() {
    return this.baseListService.totalFilteredItems;
  }

  get pageSize() {
    return this.baseListService.pageSize;
  }

  get paginatedItems() {
    return this.baseListService.paginatedItems;
  }

  get filteredItems() {
    return this.baseListService.filteredItems;
  }

  get allItems() {
    return this.baseListService.items;
  }

  // Métodos de filtros
  applyFilters() {
    // Verificar que el servicio base tenga datos válidos antes de aplicar filtros
    if (Array.isArray(this.baseListService.items)) {
      this.baseListService.applyFilters(this.getFilterConfig());
    }
  }

  setFilter(key: string, value: any) {
    this.baseListService.setFilter(key, value);
    this.applyFilters();
  }

  clearFilters() {
    this.baseListService.clearFilters();
    this.applyFilters();
  }

  // Métodos de paginación
  nextPage() {
    this.baseListService.nextPage();
  }

  previousPage() {
    this.baseListService.previousPage();
  }

  // Métodos utilitarios
  async closeAllSlidingItems(): Promise<void> {
    if (this.slidingItems && this.slidingItems.length > 0) {
      const items = this.slidingItems.toArray();
      await Promise.all(items.map((item) => item.closeOpened()));
    }
  }

  async mostrarToast(
    mensaje: string,
    color: string = 'dark',
    duracion: number = 3000
  ) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: duracion,
      color: color,
      position: 'bottom',
      buttons: [{ text: 'Cerrar', role: 'cancel' }],
    });
    await toast.present();
  }

  // Métodos para actualizar datos
  updateItem(predicate: (item: T) => boolean, updatedItem: T) {
    this.baseListService.updateItem(predicate, updatedItem);
    // Solo aplicar filtros si hay datos válidos
    if (
      Array.isArray(this.baseListService.items) &&
      this.baseListService.items.length >= 0
    ) {
      this.applyFilters();
    }
  }

  removeItem(predicate: (item: T) => boolean) {
    this.baseListService.removeItem(predicate);
    // Solo aplicar filtros si hay datos válidos
    if (
      Array.isArray(this.baseListService.items) &&
      this.baseListService.items.length >= 0
    ) {
      this.applyFilters();
    }
  }
}
