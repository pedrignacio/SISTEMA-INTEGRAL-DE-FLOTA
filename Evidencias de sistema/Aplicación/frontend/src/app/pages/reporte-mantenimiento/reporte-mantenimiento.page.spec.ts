import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReporteMantenimientoPage } from './reporte-mantenimiento.page';

describe('ReporteMantenimientoPage', () => {
  let component: ReporteMantenimientoPage;
  let fixture: ComponentFixture<ReporteMantenimientoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReporteMantenimientoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
