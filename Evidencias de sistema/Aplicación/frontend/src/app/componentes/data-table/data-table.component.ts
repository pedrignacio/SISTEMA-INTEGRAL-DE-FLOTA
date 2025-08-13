import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export interface ActionButton {
  icon: string;
  color: string;
  tooltip: string;
  cssClass?: string;
  onClick: (row: any) => void;
}

export interface Column {
  header: string;
  field: string;
  sortable?: boolean;
  width?: string;
  cell?: (data: any) => string; // Función personalizada para renderizar celdas
  isAction?: boolean; // Indica si la columna es para botones de acción
}

export interface PageEvent {
  pageIndex: number;
  pageSize: number;
}

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class DataTableComponent implements OnInit, OnChanges {
  @Input() columns: Column[] = [];
  @Input() data: any[] = [];
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [5, 10, 25, 50];
  @Input() showPagination = true;
  @Input() showExport = false;
  @Input() tableClass = 'display';
  @Input() tableId = 'dataTable';
  @Input() totalItems = 0; // Total de items si los datos son paginados en el servidor
  @Input() actionButtons: ActionButton[] = []; // Nueva propiedad para botones de acción
  @Input() showImport = false; // Nueva propiedad para mostrar botón de importación
  @Input() idField = 'id'; // Campo que contiene el ID de cada fila, usado para acciones
  @Output() page = new EventEmitter<PageEvent>();
  @Output() sort = new EventEmitter<{
    column: string;
    direction: 'asc' | 'desc';
  }>();
  @Output() rowClick = new EventEmitter<any>();
  @Output() export = new EventEmitter<string>(); // csv, excel, pdf
  @Output() import = new EventEmitter<string>(); // Nuevo evento para importación
 @Output() exportCsv = new EventEmitter<void>();
  @Output() exportPdf = new EventEmitter<void>();
  @Output() exportExcel = new EventEmitter<void>();
  // Variables para paginación
  currentPage = 1;
  displayData: any[] = [];
  totalPages = 0;
  Math = Math; // Para usar Math en el template

  constructor() {}

  ngOnInit(): void {
    this.updateDisplayData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['pageSize']) {
      this.updateDisplayData();
    }
  }

  updateDisplayData(): void {
    if (!this.data || this.data.length === 0) {
      this.displayData = [];
      this.totalPages = 0;
      return;
    }

    // Calcular el total de páginas
    this.totalPages = Math.ceil(
      this.totalItems > 0 ? this.totalItems : this.data.length / this.pageSize
    );

    // Si los datos ya vienen paginados del servidor, mostramos todos
    if (this.totalItems > 0) {
      this.displayData = this.data;
    } else {
      // Calculamos el slice para paginación en cliente
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.displayData = this.data.slice(start, end);
    }
  }
 onExportCsvClick() {
    this.exportCsv.emit();
  }

  onExportPdfClick() {
    this.exportPdf.emit();
  }
  onExportExcelClick() {
    this.exportExcel.emit();
  }
  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.updateDisplayData();

    this.page.emit({
      pageIndex: this.currentPage - 1, // Para compatibilidad con sistemas basados en 0
      pageSize: this.pageSize,
    });
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize = Number(select.value);
    this.currentPage = 1; // Volver a la primera página al cambiar el tamaño
    this.updateDisplayData();

    this.page.emit({
      pageIndex: 0,
      pageSize: this.pageSize,
    });
  }

  getPaginationRange(): number[] {
    const range: number[] = [];
    const maxVisiblePages = 5;
    if (this.totalPages < 1) {
      return [1];
    }
    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2)
    );
    const endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
    for (let i = startPage; i <= endPage; i++) {
      range.push(i);
    }
    // Si no hay páginas, aseguramos que al menos esté la página 1
    if (range.length === 0) {
      range.push(1);
    }
    return range;
  }

  onRowClick(row: any): void {
    this.rowClick.emit(row);
  }

  onSortColumn(column: Column): void {
    if (!column.sortable) {
      return;
    }

    // Implementación básica, en un caso real podría ser más compleja
    this.sort.emit({
      column: column.field,
      direction: 'asc', // Simplificado, normalmente alternaría entre asc/desc
    });
  }
  onImport(format: string): void {
    // Emitir evento de importación, el componente padre manejará la lógica
    this.import.emit(format);
  }

  onExport(format: string): void {
    this.export.emit(format);
  }

  // Helper para acceder a los valores de las propiedades anidadas como "user.address.street"
  getPropertyValue(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o && o[p], obj);
  }
  // Helper para renderizar celdas personalizadas
  renderCell(column: Column, row: any): string {
    if (column.isAction) {
      return ''; // Las celdas de acción se manejan de forma especial en el template
    }

    if (column.cell) {
      return column.cell(row);
    }

    const value = this.getPropertyValue(row, column.field);
    if (value === null || value === undefined) {
      return '';
    }

    return value.toString();
  }

  // nuevo helper
  getCellClass(column: Column, row: any): string {
    if (column.field === 'estado_vehi' && row.estadoVehi) {
      return 'status-' + row.estadoVehi;
    }
    return '';
  }
}
