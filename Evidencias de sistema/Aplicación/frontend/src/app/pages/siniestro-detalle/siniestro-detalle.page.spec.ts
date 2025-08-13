import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SiniestroDetallePage } from './siniestro-detalle.page';

describe('SiniestroDetallePage', () => {
  let component: SiniestroDetallePage;
  let fixture: ComponentFixture<SiniestroDetallePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SiniestroDetallePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
