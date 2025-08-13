import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestionUsuariosPage } from './gestion-usuarios.page';

describe('GestionUsuariosPage', () => {
  let component: GestionUsuariosPage;
  let fixture: ComponentFixture<GestionUsuariosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GestionUsuariosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
