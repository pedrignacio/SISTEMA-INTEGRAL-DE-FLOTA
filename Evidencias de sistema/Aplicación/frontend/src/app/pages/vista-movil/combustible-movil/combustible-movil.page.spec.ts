import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CombustibleMovilPage } from './combustible-movil.page';

describe('CombustibleMovilPage', () => {
  let component: CombustibleMovilPage;
  let fixture: ComponentFixture<CombustibleMovilPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CombustibleMovilPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
