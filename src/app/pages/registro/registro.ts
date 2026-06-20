import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

/** Registro de estudiante (CU-01). Tras crear la cuenta inicia sesión. */
@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-full items-center justify-center bg-slate-100 p-4">
      <form
        [formGroup]="form"
        (ngSubmit)="enviar()"
        class="w-full max-w-sm rounded-xl bg-white p-8 shadow"
      >
        <h1 class="text-xl font-semibold text-slate-800">Crear cuenta</h1>
        <p class="mb-6 text-sm text-slate-500">Estudiante de TesisGuard</p>

        <label class="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
        <input
          formControlName="nombre"
          class="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />

        <label class="mb-1 block text-sm font-medium text-slate-700">Correo</label>
        <input
          type="email"
          formControlName="email"
          class="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />

        <label class="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
        <input
          type="password"
          formControlName="password"
          class="mb-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <p class="mb-4 text-xs text-slate-400">Mínimo 8 caracteres.</p>

        @if (error()) {
          <p class="mb-3 text-sm text-red-600">{{ error() }}</p>
        }

        <button
          type="submit"
          [disabled]="form.invalid || cargando()"
          class="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {{ cargando() ? 'Creando…' : 'Crear cuenta' }}
        </button>

        <p class="mt-4 text-center text-sm text-slate-600">
          ¿Ya tienes cuenta? <a routerLink="/login" class="hover:underline">Inicia sesión</a>
        </p>
      </form>
    </div>
  `,
})
export class Registro {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  enviar(): void {
    if (this.form.invalid) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const { nombre, email, password } = this.form.getRawValue();
    this.auth
      .register(nombre, email, password)
      .pipe(switchMap(() => this.auth.login(email, password)))
      .subscribe({
        next: () => this.router.navigate(['/app']),
        error: (err) => {
          this.error.set(
            err?.status === 409 ? 'Ese correo ya está registrado.' : 'No se pudo crear la cuenta.',
          );
          this.cargando.set(false);
        },
      });
  }
}
