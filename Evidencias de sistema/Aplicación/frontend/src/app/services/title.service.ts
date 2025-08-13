import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TitleService {
  private titleSubject = new BehaviorSubject<string>(
    'SIF - Sistema Integral de Flota'
  );
  public title$ = this.titleSubject.asObservable();

  setTitle(title: string) {
    this.titleSubject.next(title);
  }

  getTitle(): string {
    return this.titleSubject.value;
  }
}
