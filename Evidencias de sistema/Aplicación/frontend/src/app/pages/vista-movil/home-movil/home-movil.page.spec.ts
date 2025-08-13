import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeMovilPage } from './home-movil.page';

describe('HomeMovilPage', () => {
  let component: HomeMovilPage;
  let fixture: ComponentFixture<HomeMovilPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeMovilPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
