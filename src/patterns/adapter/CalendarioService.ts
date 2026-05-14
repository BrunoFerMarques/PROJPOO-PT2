import type { Reserva } from "../../domain/Reserva.js"

export interface CalendarioService {
	publicarRerserva (
		reserva: Reserva,
		nomeUsuario: string,
		nomeSala: string
	): Promise<void>;

	removerReserva(reservaId: string) Promise<void>;
}	