export type Rol = 'ESTUDIANTE' | 'ADMINISTRADOR';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  foto_perfil_url: string | null;
  activo: boolean;
}
