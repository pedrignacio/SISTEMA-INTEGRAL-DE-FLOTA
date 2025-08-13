# Componentes Genéricos Reutilizables

Esta carpeta contiene componentes genéricos y reutilizables que pueden ser utilizados en toda la aplicación.

## Componentes Disponibles

### 1. SearchBar Component (`app-search-bar`)

Componente de búsqueda genérico que emite eventos cuando el usuario escribe.

**Props:**
- `placeholder`: Texto de placeholder (default: "Buscar...")
- `debounce`: Tiempo de debounce en ms (default: 300)
- `showClearButton`: Mostrar botón de limpiar (default: "focus")
- `disabled`: Deshabilitar componente (default: false)
- `value`: Valor inicial

**Eventos:**
- `searchChange`: Emite el valor de búsqueda
- `ionClear`: Emite cuando se limpia la búsqueda

**Ejemplo:**
```html
<app-search-bar
  placeholder="Buscar vehículos..."
  [value]="searchValue"
  (searchChange)="onSearchChange($event)"
  (ionClear)="onSearchClear()">
</app-search-bar>
```

### 2. FilterToolbar Component (`app-filter-toolbar`)

Toolbar de filtros con botones de ordenamiento.

**Props:**
- `filterOptions`: Array de opciones de filtro (FilterOption[])
- `currentSort`: Criterio de ordenamiento actual (SortCriteria | null)
- `showSortButtons`: Mostrar botones de ordenamiento (default: true)

**Eventos:**
- `sortChange`: Emite cuando cambia el ordenamiento
- `filterApply`: Emite cuando se aplica un filtro

**Interfaces:**
```typescript
interface FilterOption {
  key: string;
  label: string;
  icon?: string;
}

interface SortCriteria {
  field: string;
  direction: 'asc' | 'desc';
}
```

### 3. DataTable Component (`app-data-table`)

Tabla genérica para mostrar cualquier tipo de datos tabulares.

**Props:**
- `columns`: Definición de columnas (TableColumn[])
- `data`: Datos a mostrar (TableData[])
- `actions`: Acciones disponibles (ActionButton[])
- `idField`: Campo que actúa como ID (default: 'id')
- `iconField`: Campo que contiene el nombre del icono
- `iconColorFn`: Función para determinar color del icono
- `emptyMessage`: Mensaje cuando no hay datos
- `emptyIcon`: Icono cuando no hay datos

**Eventos:**
- `actionClick`: Emite cuando se hace click en una acción

**Interfaces:**
```typescript
interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'chip' | 'custom';
  pipe?: string;
  cssClass?: string;
  hideOnMobile?: boolean;
  chipColorFn?: (value: any) => string;
}

interface TableData {
  [key: string]: any;
}
```

### 4. RowActions Component (`app-row-actions`)

Botones de acción para cada fila de una tabla.

**Props:**
- `actions`: Array de acciones (ActionButton[])
- `itemId`: ID del elemento
- `itemData`: Datos del elemento

**Eventos:**
- `actionClick`: Emite la acción, ID y datos del elemento

**Interface:**
```typescript
interface ActionButton {
  icon: string;
  color: string;
  action: string;
  label: string;
}
```

## Uso en Vehicle List

La vista `vehicle-list` ha sido refactorizada para usar estos componentes:

```typescript
// Configuración de columnas
tableColumns: TableColumn[] = [
  { key: 'patente', label: 'Patente', pipe: 'uppercase' },
  { key: 'marca', label: 'Marca', pipe: 'titlecase' },
  // ...más columnas
];

// Configuración de acciones
tableActions: ActionButton[] = [
  { icon: 'pencil-outline', color: 'primary', action: 'edit', label: 'Editar' },
  { icon: 'trash-outline', color: 'danger', action: 'delete', label: 'Eliminar' }
];
```

```html
<app-search-bar 
  (searchChange)="onSearchChange($event)">
</app-search-bar>

<app-filter-toolbar 
  [filterOptions]="filterOptions"
  (sortChange)="onSortChange($event)">
</app-filter-toolbar>

<app-data-table
  [columns]="tableColumns"
  [data]="filteredData"
  [actions]="tableActions"
  (actionClick)="onTableAction($event)">
</app-data-table>
```

## Características

- **Responsivos**: Usan Ionic Grid System
- **Reutilizables**: Desacoplados de lógica específica
- **Flexibles**: Configurables mediante @Input/@Output
- **Accesibles**: Incluyen aria-labels y semántica correcta
- **Standalone**: Cada componente es independiente

## Estilo

Los componentes incluyen estilos base que se adaptan al tema de Ionic. Se pueden personalizar mediante CSS custom properties o clases específicas.
