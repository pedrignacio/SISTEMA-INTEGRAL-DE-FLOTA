import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServicioDetallePage } from './servicio-detalle.page';

describe('ServicioDetallePage', () => {
  let component: ServicioDetallePage;
  let fixture: ComponentFixture<ServicioDetallePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ServicioDetallePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});