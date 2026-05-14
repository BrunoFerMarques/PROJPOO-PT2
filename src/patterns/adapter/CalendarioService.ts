import type { Reserva } from "../../domain/Reserva.ts"

export interface CalendarioService {
	publicarRerserva (
		reserva: Reserva,
		nomeUsuario: string,
		nomeSala: string
	): Promise<void>;

	removerReserva(reservaId: string) Promise<void>;
}	