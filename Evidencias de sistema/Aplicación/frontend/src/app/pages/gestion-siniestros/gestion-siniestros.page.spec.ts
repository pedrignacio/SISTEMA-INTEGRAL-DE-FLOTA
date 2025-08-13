import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestionSiniestrosPage } from './gestion-siniestros.page';

describe('GestionSiniestrosPage', () => {
  let component: GestionSiniestrosPage;
  let fixture: ComponentFixture<GestionSiniestrosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GestionSiniestrosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
