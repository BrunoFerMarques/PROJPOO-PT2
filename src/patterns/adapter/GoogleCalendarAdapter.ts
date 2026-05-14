import type { Reserva } from "../../domain/Reserva.ts";
import type { CalendarioService } from "./CalendarioService.ts";
import { GoogleCalendarAPI } from "./GoogleCalendarAPI.js";

export class GoogleCalendarAdapter implements CalendarioService {
	private readonly api = new GoogleCalendarAPI();

	private readonly events = new Map<string, string>();

	async publicarReserva(
		reserva: Reserva,
		nomeUsuario: string,
		nomeSala: string
	): Promise<void> {
		const { id: gcalID } = await this.api.createEvent({
			summary: `Reserva — ${nomeSala}`,
      		description: `Reservado por ${nomeUsuario} (id: ${reserva.id})`,
      		start: {
        		dateTime: reserva.inicio.toISOString(),
        		timeZone: "America/Sao_Paulo",
      		},
      		end: {
        		dateTime: reserva.fim.toISOString(),
        		timeZone: "America/Sao_Paulo",
      		},
		});

		this.eventosGcal.set(reserva.id, gcalId);
	}

	async removerReserva(reservaId: string): Promise<void> {
		const gcalId = this.eventosGcal.get(reservaId);
		if(!gcalId) return;

		await this.api.deleteEvent(gcallId);
		this.eventosGcal.delete(reservaID);
	}
}