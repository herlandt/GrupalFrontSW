import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { Plan } from '../../../core/models/plan.model';
import { SuscripcionesService } from './suscripciones.service';

/** Valida que el precio sea numérico y mayor que 0 (coincide con Field(gt=0) del backend). */
function precioPositivo(control: AbstractControl): ValidationErrors | null {
  const n = Number(control.value);
  return Number.isFinite(n) && n > 0 ? null : { precioInvalido: true };
}

/** Gestión de tarifas / planes (CU-02, solo administrador). */
@Component({
  selector: 'app-suscripciones',
  imports: [ReactiveFormsModule],
  template: `
    <section class="max-w-3xl">
      <h2 class="mb-6 text-xl font-semibold text-slate-800">Planes de suscripción</h2>

      <div class="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-3 text-sm font-semibold text-slate-700">Nuevo plan</h3>
        <form [formGroup]="form" (ngSubmit)="crear()" class="flex flex-wrap items-end gap-3">
          <div>
            <label class="mb-1 block text-xs text-slate-500">Nombre</label>
            <input
              formControlName="nombre"
              class="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-slate-500">Precio (USD)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              formControlName="precio"
              class="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-slate-500">Días</label>
            <input
              type="number"
              formControlName="periodo_dias"
              class="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <button
            type="submit"
            [disabled]="form.invalid"
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Crear
          </button>
        </form>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[40rem] text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th class="px-4 py-3">Plan</th>
              <th class="px-4 py-3">Precio</th>
              <th class="px-4 py-3">Período</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            @for (plan of planes(); track plan.id) {
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3 font-medium text-slate-800">{{ plan.nombre }}</td>
                <td class="px-4 py-3">
                  <input
                    #precio
                    [value]="plan.precio"
                    class="w-24 rounded border border-slate-300 px-2 py-1"
                  />
                  {{ plan.moneda }}
                </td>
                <td class="px-4 py-3 text-slate-600">{{ plan.periodo_dias }} días</td>
                <td class="px-4 py-3">
                  @if (plan.activo) {
                    <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                      >Activo</span
                    >
                  } @else {
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                      >Inactivo</span
                    >
                  }
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    (click)="cambiarPrecio(plan, precio.value)"
                    class="mr-3 text-slate-700 hover:underline"
                  >
                    Guardar precio
                  </button>
                  <button (click)="toggleActivo(plan)" class="text-slate-500 hover:underline">
                    {{ plan.activo ? 'Desactivar' : 'Activar' }}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (mensaje()) {
        <p class="mt-4 text-sm text-emerald-600">{{ mensaje() }}</p>
      }
      @if (error(); as e) {
        <p class="mt-4 text-sm text-rose-600">{{ e }}</p>
      }
    </section>
  `,
})
export class Suscripciones {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SuscripcionesService);

  protected readonly planes = signal<Plan[]>([]);
  protected readonly mensaje = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    precio: ['', [Validators.required, precioPositivo]],
    periodo_dias: [30, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    // Pantalla de admin: incluye planes inactivos para poder reactivarlos.
    this.service.listar(true).subscribe((planes) => this.planes.set(planes));
  }

  crear(): void {
    if (this.form.invalid) {
      return;
    }
    this.error.set(null);
    const v = this.form.getRawValue();
    this.service
      .crear({ nombre: v.nombre, precio: v.precio, moneda: 'USD', periodo_dias: v.periodo_dias })
      .subscribe({
        next: () => {
          this.form.reset({ nombre: '', precio: '', periodo_dias: 30 });
          this.mensaje.set('Plan creado.');
          this.cargar();
        },
        error: () => this.error.set('No se pudo crear el plan. Revisa los datos.'),
      });
  }

  cambiarPrecio(plan: Plan, nuevo: string): void {
    if (!(Number(nuevo) > 0)) {
      this.error.set('El precio debe ser un número mayor que 0.');
      return;
    }
    this.error.set(null);
    this.service.actualizar(plan.id, { precio: nuevo }).subscribe({
      next: () => {
        this.mensaje.set(`Tarifa de "${plan.nombre}" actualizada.`);
        this.cargar();
      },
      error: () => this.error.set('No se pudo actualizar la tarifa.'),
    });
  }

  toggleActivo(plan: Plan): void {
    this.service.actualizar(plan.id, { activo: !plan.activo }).subscribe({
      next: () => this.cargar(),
      error: () => this.error.set('No se pudo cambiar el estado del plan.'),
    });
  }
}
