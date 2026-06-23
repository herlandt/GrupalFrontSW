import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from './usuarios.service';

/** Mi perfil (CU-01): ver/editar datos y subir foto. */
@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule],
  template: `
    <section class="max-w-lg">
      <h2 class="mb-6 text-xl font-semibold text-slate-800">Mi perfil</h2>

      @if (usuario(); as u) {
        <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <div class="mb-6 flex items-center gap-4">
            @if (fotoUrl()) {
              <img [src]="fotoUrl()" alt="Foto" class="h-16 w-16 rounded-full object-cover" />
            } @else {
              <div
                class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xl font-semibold text-slate-600"
              >
                {{ u.nombre.charAt(0) }}
              </div>
            }
            <div>
              <p class="font-medium text-slate-800">{{ u.email }}</p>
              <span
                class="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >{{ u.rol }}</span
              >
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="guardar()">
            <label class="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              formControlName="nombre"
              class="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              [disabled]="form.invalid || cargando()"
              class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Guardar cambios
            </button>
          </form>

          <div class="mt-6 border-t border-slate-100 pt-4">
            <p class="mb-1 text-sm font-medium text-slate-700">Foto de perfil</p>
            <label
              class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <span>Cambiar foto…</span>
              <input type="file" accept="image/*" (change)="onArchivo($event)" class="hidden" />
            </label>
          </div>

          <div class="mt-6 border-t border-slate-100 pt-4">
            <p class="mb-2 text-sm font-medium text-slate-700">Preferencias</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="text-xs text-slate-500">
                Tema
                <select
                  (change)="tema.set($any($event.target).value)"
                  class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="claro" [selected]="tema() === 'claro'">Claro</option>
                  <option value="oscuro" [selected]="tema() === 'oscuro'">Oscuro</option>
                </select>
              </label>
              <label class="text-xs text-slate-500">
                Idioma
                <select
                  (change)="idioma.set($any($event.target).value)"
                  class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="es" [selected]="idioma() === 'es'">Español</option>
                  <option value="en" [selected]="idioma() === 'en'">English</option>
                </select>
              </label>
            </div>
            <button
              (click)="guardarPreferencias()"
              class="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Guardar preferencias
            </button>
          </div>

          @if (mensaje()) {
            <p class="mt-4 text-sm text-emerald-600">{{ mensaje() }}</p>
          }
        </div>
      } @else {
        <p class="text-sm text-slate-400">Cargando perfil…</p>
      }
    </section>
  `,
})
export class Usuarios {
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly fb = inject(FormBuilder);
  private readonly origin = environment.apiUrl.replace('/api/v1', '');

  protected readonly usuario = this.auth.usuario;
  protected readonly cargando = signal(false);
  protected readonly mensaje = signal<string | null>(null);

  protected readonly fotoUrl = computed(() => {
    const u = this.usuario();
    return u?.foto_perfil_url ? this.origin + u.foto_perfil_url : null;
  });

  protected readonly form = this.fb.nonNullable.group({
    nombre: [this.auth.usuario()?.nombre ?? '', [Validators.required]],
  });

  protected readonly tema = signal<string>(
    (this.auth.usuario()?.preferencias?.['tema'] as string) ?? 'claro',
  );
  protected readonly idioma = signal<string>(
    (this.auth.usuario()?.preferencias?.['idioma'] as string) ?? 'es',
  );

  guardar(): void {
    if (this.form.invalid) {
      return;
    }
    this.cargando.set(true);
    this.mensaje.set(null);
    this.usuarios.actualizarPerfil(this.form.getRawValue().nombre).subscribe({
      next: (u) => {
        this.auth.setUsuario(u);
        this.mensaje.set('Perfil actualizado.');
        this.cargando.set(false);
      },
      error: () => {
        this.mensaje.set('No se pudo actualizar el perfil.');
        this.cargando.set(false);
      },
    });
  }

  guardarPreferencias(): void {
    this.mensaje.set(null);
    this.usuarios
      .actualizarPerfil(this.form.getRawValue().nombre, {
        tema: this.tema(),
        idioma: this.idioma(),
      })
      .subscribe({
        next: (u) => {
          this.auth.setUsuario(u);
          this.mensaje.set('Preferencias guardadas.');
        },
        error: () => this.mensaje.set('No se pudieron guardar las preferencias.'),
      });
  }

  onArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.usuarios.subirFoto(file).subscribe({
      next: (u) => {
        this.auth.setUsuario(u);
        this.mensaje.set('Foto actualizada.');
      },
      error: () => this.mensaje.set('No se pudo subir la foto.'),
    });
  }
}
