import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistorialCombustiblePage } from './historial-combustible.page';

describe('HistorialCombustiblePage', () => {
  let component: HistorialCombustiblePage;
  let fixture: ComponentFixture<HistorialCombustiblePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HistorialCombustiblePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
