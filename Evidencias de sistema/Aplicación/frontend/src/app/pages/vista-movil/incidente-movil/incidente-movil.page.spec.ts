import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IncidenteMovilPage } from './incidente-movil.page';

describe('IncidenteMovilPage', () => {
  let component: IncidenteMovilPage;
  let fixture: ComponentFixture<IncidenteMovilPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IncidenteMovilPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
