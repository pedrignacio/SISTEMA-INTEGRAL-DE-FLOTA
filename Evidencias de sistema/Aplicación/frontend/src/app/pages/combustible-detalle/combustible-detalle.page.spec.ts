import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CombustibleDetallePage } from './combustible-detalle.page';

describe('CombustibleDetallePage', () => {
  let component: CombustibleDetallePage;
  let fixture: ComponentFixture<CombustibleDetallePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CombustibleDetallePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
