import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AsignacionListPage } from './asignacion-list.page';

describe('AsignacionListPage', () => {
  let component: AsignacionListPage;
  let fixture: ComponentFixture<AsignacionListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AsignacionListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
