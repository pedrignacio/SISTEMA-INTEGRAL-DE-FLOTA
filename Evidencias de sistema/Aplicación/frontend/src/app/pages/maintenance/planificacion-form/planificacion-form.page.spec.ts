import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanificacionFormPage } from './planificacion-form.page';

describe('PlanificacionFormPage', () => {
  let component: PlanificacionFormPage;
  let fixture: ComponentFixture<PlanificacionFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanificacionFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
