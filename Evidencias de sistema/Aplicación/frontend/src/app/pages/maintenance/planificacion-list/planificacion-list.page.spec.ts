import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanificacionListPage } from './planificacion-list.page';

describe('PlanificacionListPage', () => {
  let component: PlanificacionListPage;
  let fixture: ComponentFixture<PlanificacionListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanificacionListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
