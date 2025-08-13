import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehicleFormPage } from './vehicle-form.page';

describe('VehicleFormPage', () => {
  let component: VehicleFormPage;
  let fixture: ComponentFixture<VehicleFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VehicleFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
