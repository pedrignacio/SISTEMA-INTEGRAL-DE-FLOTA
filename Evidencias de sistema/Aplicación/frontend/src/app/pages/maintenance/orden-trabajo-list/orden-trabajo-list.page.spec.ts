import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdenTrabajoListPage } from './orden-trabajo-list.page';

describe('OrdenTrabajoListPage', () => {
  let component: OrdenTrabajoListPage;
  let fixture: ComponentFixture<OrdenTrabajoListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OrdenTrabajoListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
