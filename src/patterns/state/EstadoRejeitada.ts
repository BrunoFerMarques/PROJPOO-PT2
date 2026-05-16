import type { EstadoReserva, ResultadoTransicao } from "./EstadoReserva.js";

/**
 * Estado terminal. Reserva rejeitada por um docente.
 * Nenhuma transicao eh permitida.
 * Nao bloqueia mais conflitos de horario.
 */
export class EstadoRejeitada implements EstadoReserva {
  nome() {
    return "REJEITADA" as const;
  }

  aprovar(): ResultadoTransicao {
    throw new Error("Reserva foi rejeitada e nao pode ser aprovada.");
  }

  rejeitar(): ResultadoTransicao {
    throw new Error("Reserva ja foi rejeitada.");
  }

  cancelar(): ResultadoTransicao {
    throw new Error("Reserva rejeitada nao pode ser cancelada.");
  }

  podeAlterar(): boolean {
    return false;
  }

  ehTerminal(): boolean {
    return true;
  }

  bloqueiaHorario(): boolean {
    return false;
  }
}
