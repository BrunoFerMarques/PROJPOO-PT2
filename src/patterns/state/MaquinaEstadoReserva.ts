import type { StatusReserva } from "../../domain/Reserva.js";
import type { EstadoReserva } from "./EstadoReserva.js";
import { EstadoPendente } from "./EstadoPendente.js";
import { EstadoConfirmada } from "./EstadoConfirmada.js";
import { EstadoCancelada } from "./EstadoCancelada.js";
import { EstadoRejeitada } from "./EstadoRejeitada.js";

/**
 * Resolve o objeto EstadoReserva correspondente a um StatusReserva.
 *
 * Como o status persistido na entidade Reserva eh apenas uma string
 * (compativel com codigo legado e serializacao), este helper centraliza
 * o "lookup" para o objeto-estado que carrega o comportamento.
 */
export function obterEstado(status: StatusReserva): EstadoReserva {
  switch (status) {
    case "PENDENTE":
      return new EstadoPendente();
    case "CONFIRMADA":
      return new EstadoConfirmada();
    case "CANCELADA":
      return new EstadoCancelada();
    case "REJEITADA":
      return new EstadoRejeitada();
    default: {
      const _exhaustive: never = status;
      throw new Error(`Status de reserva desconhecido: ${_exhaustive}`);
    }
  }
}

export {
  EstadoPendente,
  EstadoConfirmada,
  EstadoCancelada,
  EstadoRejeitada,
};
