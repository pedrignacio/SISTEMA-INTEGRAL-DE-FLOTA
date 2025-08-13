import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistorialVehiculoPage } from './historial-vehiculo.page';

describe('HistorialVehiculoPage', () => {
  let component: HistorialVehiculoPage;
  let fixture: ComponentFixture<HistorialVehiculoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HistorialVehiculoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
