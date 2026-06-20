import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/** Solicitud de restablecimiento de contraseña (CU-01). */
@Component({
  selector: 'app-recuperar',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-full items-center justify-center bg-slate-100 p-4">
      <div class="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 class="text-xl font-semibold text-slate-800">Recuperar contraseña</h1>
        <p class="mb-6 text-sm text-slate-500">Te enviaremos un enlace por correo.</p>

        @if (enviado()) {
          <p class="text-sm text-slate-600">
            Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.
          </p>
          <a routerLink="/login" class="mt-4 inline-block text-sm text-slate-600 hover:underline"
            >Volver a iniciar sesión</a
          >
        } @else {
          <form [formGroup]="form" (ngSubmit)="enviar()">
            <label class="mb-1 block text-sm font-medium text-slate-700">Correo</label>
            <input
              type="email"
              formControlName="email"
              class="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              [disabled]="form.invalid || cargando()"
              class="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {{ cargando() ? 'Enviando…' : 'Enviar enlace' }}
            </button>
            <a routerLink="/login" class="mt-4 inline-block text-sm text-slate-600 hover:underline"
              >Volver</a
            >
          </form>
        }
      </div>
    </div>
  `,
})
export class Recuperar {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly cargando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  enviar(): void {
    if (this.form.invalid) {
      return;
    }
    this.cargando.set(true);
    this.auth.requestReset(this.form.getRawValue().email).subscribe({
      next: () => this.enviado.set(true),
      error: () => this.enviado.set(true), // no se revela si el correo existe
    });
  }
}
