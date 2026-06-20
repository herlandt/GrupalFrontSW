export type EstadoAlertaEtica = 'PENDIENTE' | 'EN_REVISION' | 'CONFIRMADA' | 'DESESTIMADA';

export interface AlertaEtica {
  id: number;
  version_id: number;
  tipo: string;
  fragmento: string | null;
  estado: EstadoAlertaEtica;
  decision_admin_id: number | null;
  created_at: string;
}
