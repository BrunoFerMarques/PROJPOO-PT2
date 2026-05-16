import type { Reserva } from "../../domain/Reserva.js";
import type { Usuario } from "../../domain/Usuario.js";
import type { EstadoReserva, ResultadoTransicao } from "./EstadoReserva.js";

/**
 * Reserva aguardando aprovacao de um docente.
 *
 * Transicoes validas:
 *   PENDENTE → CONFIRMADA  (docente aprova)
 *   PENDENTE → REJEITADA   (docente rejeita)
 *   PENDENTE → CANCELADA   (titular desiste)
 *
 * Nao pode ser alterada enquanto pendente.
 * Bloqueia conflitos de horario para impedir aprovacao dupla.
 */
export class EstadoPendente implements EstadoReserva {
  nome() {
    return "PENDENTE" as const;
  }

  aprovar(_reserva: Reserva, aprovador: Usuario): ResultadoTransicao {
    if (aprovador.papel !== "DOCENTE") {
      throw new Error("Apenas docentes podem aprovar reservas.");
    }
    return { novoStatus: "CONFIRMADA" };
  }

  rejeitar(
    _reserva: Reserva,
    aprovador: Usuario,
    motivo: string
  ): ResultadoTransicao {
    if (aprovador.papel !== "DOCENTE") {
      throw new Error("Apenas docentes podem rejeitar reservas.");
    }
    if (!motivo || motivo.trim().length === 0) {
      throw new Error("Rejeicao exige um motivo.");
    }
    return { novoStatus: "REJEITADA", motivo: motivo.trim() };
  }

  cancelar(reserva: Reserva, solicitante: Usuario): ResultadoTransicao {
    if (reserva.usuarioId !== solicitante.id) {
      throw new Error("Somente o titular pode cancelar a reserva.");
    }
    return { novoStatus: "CANCELADA" };
  }

  podeAlterar(): boolean {
    return false;
  }

  ehTerminal(): boolean {
    return false;
  }

  bloqueiaHorario(): boolean {
    return true;
  }
}
