import type { EstadoReserva, ResultadoTransicao } from "./EstadoReserva.js";

/**
 * Estado terminal. Reserva cancelada pelo titular.
 * Nenhuma transicao eh permitida.
 * Nao bloqueia mais conflitos de horario.
 */
export class EstadoCancelada implements EstadoReserva {
  nome() {
    return "CANCELADA" as const;
  }

  aprovar(): ResultadoTransicao {
    throw new Error("Reserva ja foi cancelada.");
  }

  rejeitar(): ResultadoTransicao {
    throw new Error("Reserva ja foi cancelada.");
  }

  cancelar(): ResultadoTransicao {
    throw new Error("Reserva ja esta cancelada.");
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
