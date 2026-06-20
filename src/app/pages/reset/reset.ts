import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/** Confirmación de restablecimiento de contraseña (CU-01).
 *  El token llega por query param: /reset?token=... */
@Component({
  selector: 'app-reset',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-full items-center justify-center bg-slate-100 p-4">
      <div class="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 class="text-xl font-semibold text-slate-800">Nueva contraseña</h1>

        @if (listo()) {
          <p class="mt-2 text-sm text-slate-600">Tu contraseña se actualizó correctamente.</p>
          <a routerLink="/login" class="mt-4 inline-block text-sm text-slate-600 hover:underline"
            >Iniciar sesión</a
          >
        } @else if (!token) {
          <p class="mt-2 text-sm text-red-600">Enlace inválido o incompleto.</p>
        } @else {
          <p class="mb-6 text-sm text-slate-500">Elige una contraseña nueva.</p>
          <form [formGroup]="form" (ngSubmit)="enviar()">
            <input
              type="password"
              formControlName="password"
              placeholder="Nueva contraseña"
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
              {{ cargando() ? 'Guardando…' : 'Guardar' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class Reset {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly cargando = signal(false);
  protected readonly listo = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  enviar(): void {
    if (this.form.invalid) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.auth.confirmReset(this.token, this.form.getRawValue().password).subscribe({
      next: () => this.listo.set(true),
      error: () => {
        this.error.set('El enlace expiró o no es válido.');
        this.cargando.set(false);
      },
    });
  }
}
