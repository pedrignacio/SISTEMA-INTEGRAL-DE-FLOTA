import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehicleListPage } from './vehicle-list.page';

describe('VehicleListPage', () => {
  let component: VehicleListPage;
  let fixture: ComponentFixture<VehicleListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VehicleListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
