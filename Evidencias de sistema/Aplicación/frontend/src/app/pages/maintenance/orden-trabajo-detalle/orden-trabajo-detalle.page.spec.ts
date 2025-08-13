import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdenTrabajoDetallePage } from './orden-trabajo-detalle.page';

describe('OrdenTrabajoDetallePage', () => {
  let component: OrdenTrabajoDetallePage;
  let fixture: ComponentFixture<OrdenTrabajoDetallePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OrdenTrabajoDetallePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
