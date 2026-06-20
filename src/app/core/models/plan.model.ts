/** Plan de suscripción (tarifa). `precio` llega como string (Decimal del backend). */
export interface Plan {
  id: number;
  nombre: string;
  precio: string;
  moneda: string;
  periodo_dias: number;
  activo: boolean;
}
