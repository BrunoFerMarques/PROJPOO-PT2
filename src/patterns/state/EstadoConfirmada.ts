import type { Reserva } from "../../domain/Reserva.js";
import type { Usuario } from "../../domain/Usuario.js";
import type { EstadoReserva, ResultadoTransicao } from "./EstadoReserva.js";

/**
 * Reserva ativa, ja validada e visivel no calendario.
 *
 * Transicoes validas:
 *   CONFIRMADA → CANCELADA  (titular cancela)
 *
 * Pode ser alterada (mantendo status).
 * Bloqueia conflitos de horario.
 */
export class EstadoConfirmada implements EstadoReserva {
  nome() {
    return "CONFIRMADA" as const;
  }

  aprovar(): ResultadoTransicao {
    throw new Error("Reserva ja esta confirmada.");
  }

  rejeitar(): ResultadoTransicao {
    throw new Error("Reserva confirmada nao pode ser rejeitada.");
  }

  cancelar(reserva: Reserva, solicitante: Usuario): ResultadoTransicao {
    if (reserva.usuarioId !== solicitante.id) {
      throw new Error("Somente o titular pode cancelar a reserva.");
    }
    return { novoStatus: "CANCELADA" };
  }

  podeAlterar(): boolean {
    return true;
  }

  ehTerminal(): boolean {
    return false;
  }

  bloqueiaHorario(): boolean {
    return true;
  }
}
