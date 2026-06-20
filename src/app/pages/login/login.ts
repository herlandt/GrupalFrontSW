import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/** Pantalla pública de inicio de sesión (CU-01). */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-full items-center justify-center bg-slate-100 p-4">
      <form
        [formGroup]="form"
        (ngSubmit)="enviar()"
        class="w-full max-w-sm rounded-xl bg-white p-8 shadow"
      >
        <h1 class="text-xl font-semibold text-slate-800">TesisGuard</h1>
        <p class="mb-6 text-sm text-slate-500">Iniciar sesión</p>

        <label class="mb-1 block text-sm font-medium text-slate-700">Correo</label>
        <input
          type="email"
          formControlName="email"
          class="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          placeholder="tu@correo.com"
        />

        <label class="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
        <input
          type="password"
          formControlName="password"
          class="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          placeholder="••••••••"
        />

        @if (error()) {
          <p class="mb-3 text-sm text-red-600">{{ error() }}</p>
        }

        <button
          type="submit"
          [disabled]="form.invalid || cargando()"
          class="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {{ cargando() ? 'Entrando…' : 'Entrar' }}
        </button>

        <div class="mt-4 flex justify-between text-sm">
          <a routerLink="/registro" class="text-slate-600 hover:underline">Crear cuenta</a>
          <a routerLink="/recuperar" class="text-slate-600 hover:underline">¿Olvidaste tu clave?</a>
        </div>
      </form>
    </div>
  `,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  enviar(): void {
    if (this.form.invalid) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/app']),
      error: () => {
        this.error.set('Correo o contraseña incorrectos.');
        this.cargando.set(false);
      },
    });
  }
}
