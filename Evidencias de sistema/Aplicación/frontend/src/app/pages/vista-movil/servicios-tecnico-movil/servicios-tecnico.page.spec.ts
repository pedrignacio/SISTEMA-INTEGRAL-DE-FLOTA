import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiciosTecnicoPage } from './servicios-tecnico.page';

describe('ServiciosTecnicoPage', () => {
  let component: ServiciosTecnicoPage;
  let fixture: ComponentFixture<ServiciosTecnicoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ServiciosTecnicoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});