import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouteFormPage } from './route-form.page';

describe('RouteFormPage', () => {
  let component: RouteFormPage;
  let fixture: ComponentFixture<RouteFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RouteFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
