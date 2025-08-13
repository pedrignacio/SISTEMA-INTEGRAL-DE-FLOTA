import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidatorFn,
  AsyncValidatorFn,
} from '@angular/forms';
import { Usuario, ApiService } from 'src/app/services/api.service';
import { map, switchMap, catchError, first } from 'rxjs/operators';
import { of, timer } from 'rxjs';

// --- Las funciones de validación síncronas (rutValidator, etc.) no cambian ---
function rutValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const rut = control.value;
  if (!rut) { return null; }
  let cleanRut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  let rutBody = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);
  if (!/^\d+$/.test(rutBody) || rutBody.length < 7) { return { invalidRutFormat: true }; }
  let M = 0, S = 1;
  for (let t = parseInt(rutBody, 10); t; t = Math.floor(t / 10)) {
    S = (S + t % 10 * (9 - M++ % 6)) % 11;
  }
  return (S ? S - 1 : 'K').toString() === dv ? null : { invalidRut: true };
}
function nameValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const name = control.value;
  if (!name) { return null; }
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name) ? null : { invalidName: true };
}
function cellphoneValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const cellphone = control.value;
  if (!cellphone) { return null; }
  return /^((\+?56)?9\d{8})$/.test(cellphone.replace(/\s/g, '')) ? null : { invalidCellphone: true };
}
function licenseDatesValidator(form: FormGroup): { [key: string]: boolean } | null {
  const fecEmi = form.get('fec_emi_lic')?.value;
  const fecVen = form.get('fec_ven_lic')?.value;
  if (fecEmi && fecVen) {
    const emissionDate = new Date(fecEmi);
    const expirationDate = new Date(fecVen);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (emissionDate > expirationDate) { return { emissionAfterExpiration: true }; }
    if (emissionDate > today) { return { futureEmissionDate: true }; }
  }
  return null;
}
const passwordMatchValidator: ValidatorFn = (control: AbstractControl): { [key: string]: boolean } | null => {
  const password = control.get('clave');
  const confirmPassword = control.get('confirmClave');
  if (!password || !confirmPassword || !password.value || !confirmPassword.value) { return null; }
  if (password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  confirmPassword.setErrors(null);
  return null;
};

@Component({
  selector: 'app-usuario-form',
  templateUrl: './usuario-form.component.html',
  styleUrls: ['./usuario-form.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class UsuarioFormComponent implements OnInit {
  @Input() usuario: Usuario | null = null;
  @Input() isViewMode: boolean = false;
  isEditMode = false;

  form!: FormGroup;
  isSubmitted = false;
  roles = ['admin', 'gestor', 'conductor', 'mantenimiento', 'tecnico'];
  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);
  private apiService = inject(ApiService);

  private rutExistenceValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const rut = control.value;
      if (!rut || control.hasError('required') || control.hasError('invalidRut')) { return of(null); }
      if (this.isEditMode && this.usuario && rut === this.usuario.rut_usu) { return of(null); }
      return timer(500).pipe(
        switchMap(() => this.apiService.checkRutExists(rut, this.usuario?.id_usu)),
        map(res => (res.exists ? { rutExists: true } : null)),
        catchError(() => of(null))
      );
    };
  }
  private emailExistenceValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const email = control.value;
      if (!email || control.hasError('required') || control.hasError('email')) { return of(null); }
      if (this.isEditMode && this.usuario && email === this.usuario.email) { return of(null); }
      return timer(500).pipe(
        switchMap(() => this.apiService.checkEmailExists(email, this.usuario?.id_usu)),
        map(res => (res.exists ? { emailExists: true } : null)),
        catchError(() => of(null))
      );
    };
  }

  ngOnInit() {
    this.isEditMode = !!this.usuario;

    // 1. Crear la estructura del formulario con valores vacíos y todos los validadores.
    this.form = this.fb.group({
      rut_usu: ['', { asyncValidators: [this.rutExistenceValidator()], updateOn: 'blur' }],
      email: ['', { validators: [Validators.required, Validators.email], asyncValidators: [this.emailExistenceValidator()], updateOn: 'blur' }],
      pri_nom_usu: ['', [Validators.required, nameValidator]],
      seg_nom_usu: ['', nameValidator],
      pri_ape_usu: ['', [Validators.required, nameValidator]],
      seg_ape_usu: ['', nameValidator],
      celular: ['', cellphoneValidator],
      rol: [null, Validators.required],
      clave: [''],
      confirmClave: [''],
      fec_emi_lic: [null],
      fec_ven_lic: [null],
      tipo_lic: [null],
      archivo_url_lic: [null]
    }, {
      validators: [licenseDatesValidator, passwordMatchValidator]
    });

    // 2. Si estamos en modo edición, rellenar el formulario con los datos y deshabilitar el RUT.
    if (this.isEditMode && this.usuario) {
      // Usamos patchValue para rellenar los campos existentes.
      this.form.patchValue(this.usuario);
      
      // Formateamos las fechas que vienen del backend
      if (this.usuario.fec_emi_lic) {
        this.form.get('fec_emi_lic')?.setValue(this.usuario.fec_emi_lic.split('T')[0]);
      }
      if (this.usuario.fec_ven_lic) {
        this.form.get('fec_ven_lic')?.setValue(this.usuario.fec_ven_lic.split('T')[0]);
      }
      
      // **SOLUCIÓN:** Deshabilitar el campo RUT para que no sea editable.
      this.form.get('rut_usu')?.disable();
      
      // Limpiar validadores de contraseña que no se usan en edición
      this.form.get('clave')?.clearValidators();
      this.form.get('confirmClave')?.clearValidators();

    } else {
      // Modo Creación: aplicar validadores de contraseña
      this.form.get('clave')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('confirmClave')?.setValidators(Validators.required);
    }
    
    // 3. Si estamos en modo vista, deshabilitar todo el formulario.
    if (this.isViewMode) {
      this.form.disable();
    }

    // 4. Lógica para validadores condicionales (esto se mantiene)
    this.form.get('rol')?.valueChanges.subscribe(rol => {
      this.applyConditionalValidators(rol);
    });
    if (this.form.get('rol')?.value) {
      this.applyConditionalValidators(this.form.get('rol')?.value);
    }
    
    this.form.updateValueAndValidity();
  }

  private applyConditionalValidators(rol: string) {
    const fecEmiLicControl = this.form.get('fec_emi_lic');
    const fecVenLicControl = this.form.get('fec_ven_lic');
    const tipoLicControl = this.form.get('tipo_lic');

    if (rol === 'conductor') {
      fecEmiLicControl?.setValidators(Validators.required);
      fecVenLicControl?.setValidators(Validators.required);
      tipoLicControl?.setValidators(Validators.required);
    } else {
      fecEmiLicControl?.clearValidators();
      fecVenLicControl?.clearValidators();
      tipoLicControl?.clearValidators();
    }
    fecEmiLicControl?.updateValueAndValidity();
    fecVenLicControl?.updateValueAndValidity();
    tipoLicControl?.updateValueAndValidity();
  }

  async cancel() {
    // Código para cancelar no necesita cambios
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async closeModal() {
    // Utiliza el ModalController para cerrar el modal
    await this.modalCtrl.dismiss(null, 'close');
  }

  get f() {
    return this.form.controls;
  }

  async confirm() {
    this.isSubmitted = true;
    this.form.markAllAsTouched();

    if (this.form.pending) {
      await this.form.statusChanges.pipe(first(status => status !== 'PENDING')).toPromise();
    }

    if (!this.form.valid) {
      console.log('Formulario inválido', this.form.errors, this.form.getRawValue());
      // Aquí puedes añadir una alerta para el usuario si lo deseas
      return;
    }

    // Usamos getRawValue() para obtener el valor del RUT aunque esté deshabilitado
    const dataToSubmit = this.form.getRawValue();
    delete dataToSubmit.confirmClave;

    await this.modalCtrl.dismiss(dataToSubmit, 'confirm');
  }
}
