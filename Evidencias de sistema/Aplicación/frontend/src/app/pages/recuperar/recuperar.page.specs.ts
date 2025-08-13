import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';

import { RecuperarPage } from './recuperar.page';

describe('RecuperarPage', () => {
  let component: RecuperarPage;
  let fixture: ComponentFixture<RecuperarPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ RecuperarPage ],
      imports: [
        IonicModule.forRoot(),
        ReactiveFormsModule,
        RouterTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecuperarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with an email control', () => {
    expect(component.recuperarForm.contains('email')).toBeTruthy();
  });

  it('should make the email control required', () => {
    const control = component.recuperarForm.get('email');
    control?.setValue('');
    expect(control?.valid).toBeFalsy();
  });

  it('should make the email control accept a valid email', () => {
    const control = component.recuperarForm.get('email');
    control?.setValue('test@test.com');
    expect(control?.valid).toBeTruthy();
  });
});