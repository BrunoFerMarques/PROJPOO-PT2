import type { Reserva, StatusReserva } from "../../domain/Reserva.js";
import type { Usuario } from "../../domain/Usuario.js";

/**
 * Resultado de uma transicao de estado.
 *  - novoStatus: para qual estado a reserva deve transitar.
 *  - motivo: justificativa opcional (usado especialmente em REJEITADA).
 */
export interface ResultadoTransicao {
  novoStatus: StatusReserva;
  motivo?: string;
}

/**
 * Padrao State: cada estado possivel da Reserva implementa esta interface
 * e decide quais transicoes sao validas. O ServicoReservas delega as
 * operacoes ao estado atual em vez de espalhar if/switch pelo codigo.
 *
 * Estados:
 *  - PENDENTE      → aguardando aprovacao (Laboratorios)
 *  - CONFIRMADA    → reserva ativa
 *  - CANCELADA     → cancelada pelo titular (terminal)
 *  - REJEITADA     → rejeitada por docente (terminal)
 */
export interface EstadoReserva {
  nome(): StatusReserva;

  /** Aprova uma reserva pendente (somente docentes). */
  aprovar(reserva: Reserva, aprovador: Usuario): ResultadoTransicao;

  /** Rejeita uma reserva pendente (somente docentes). */
  rejeitar(
    reserva: Reserva,
    aprovador: Usuario,
    motivo: string
  ): ResultadoTransicao;

  /** Cancela a reserva (somente titular). */
  cancelar(reserva: Reserva, solicitante: Usuario): ResultadoTransicao;

  /** Se permite alteracao de horario/sala. */
  podeAlterar(): boolean;

  /** Estado terminal nao aceita mais transicoes. */
  ehTerminal(): boolean;

  /** Se a reserva neste estado deve bloquear conflitos de horario. */
  bloqueiaHorario(): boolean;
}
