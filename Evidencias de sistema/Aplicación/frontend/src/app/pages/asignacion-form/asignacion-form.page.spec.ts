import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AsignacionFormPage } from './asignacion-form.page';

describe('AsignacionFormPage', () => {
  let component: AsignacionFormPage;
  let fixture: ComponentFixture<AsignacionFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AsignacionFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
