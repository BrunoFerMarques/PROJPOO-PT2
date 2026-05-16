# Funcionalidade Adicional: Sistema de Aprovação para Salas Especiais

## Descrição

Algumas salas do campus têm regras de uso mais restritas — laboratórios, por
exemplo, costumam exigir supervisão. Para refletir isso no sistema, foi
introduzido um **fluxo de aprovação**: quando um usuário reserva uma sala do
tipo Laboratório, a reserva nasce no estado `PENDENTE` e só passa a valer após
um docente aprová-la. Salas comuns (cubículos e salas de grupo) continuam sendo
confirmadas imediatamente, sem mudança no fluxo original.

O sistema também permite **rejeitar** reservas pendentes (com motivo
obrigatório) e **cancelar** pedidos pendentes antes que sejam revisados.

## Padrão de Projeto: State

### Justificativa

A entidade `Reserva` já carregava um campo `status`, mas o comportamento
associado a cada status estava espalhado em condicionais dentro do
`ServicoReservas` (`if (atual.status !== "CONFIRMADA")`, etc.). Com a
introdução de dois novos status (`PENDENTE` e `REJEITADA`), essa abordagem
tornaria a classe ainda mais cheia de `if`s aninhados.

O padrão **State** resolve isso transformando cada status em uma **classe**
que conhece suas próprias transições válidas. O `ServicoReservas` apenas
delega a operação ao estado atual — quem decide se a transição é válida é
o próprio objeto-estado, por meio de polimorfismo. Isso elimina os condicionais
espalhados e centraliza as regras de ciclo de vida em um único lugar.

### Participantes

| Papel GoF       | Classe/Interface do projeto                   |
|-----------------|-----------------------------------------------|
| Context         | `Reserva` + `ServicoReservas` (cliente)       |
| State           | `EstadoReserva` (interface)                   |
| ConcreteState   | `EstadoPendente`, `EstadoConfirmada`, `EstadoCancelada`, `EstadoRejeitada` |
| Helper          | `obterEstado()` em `MaquinaEstadoReserva.ts`  |

### Diagrama de Estados

```
                       ┌─────────────┐
       Laboratório →   │  PENDENTE   │
                       └──────┬──────┘
                              │
              ┌──── aprovar ──┼──── rejeitar ────┐
              │               │                  │
              ▼               ▼                  ▼
      ┌───────────────┐   ┌──────────┐    ┌──────────────┐
      │  CONFIRMADA   │   │CANCELADA │    │  REJEITADA   │
      └───────┬───────┘   └──────────┘    └──────────────┘
              │
           cancelar
              │
              ▼
        ┌──────────┐
        │CANCELADA │
        └──────────┘
```

Estados terminais (`CANCELADA`, `REJEITADA`) não aceitam mais transições.

### Arquivos criados

```
src/patterns/state/
  EstadoReserva.ts          ← interface State
  EstadoPendente.ts         ← aprovar / rejeitar / cancelar
  EstadoConfirmada.ts       ← cancelar / alterar
  EstadoCancelada.ts        ← terminal
  EstadoRejeitada.ts        ← terminal
  MaquinaEstadoReserva.ts   ← obterEstado(status) → EstadoReserva
```

### Arquivos modificados (de forma aditiva)

- `src/domain/Reserva.ts` — `StatusReserva` agora inclui `"PENDENTE"` e
  `"REJEITADA"` além dos valores anteriores.
- `src/patterns/observer/EventoReserva.ts` — três tipos de evento novos:
  `PENDENTE_CRIADA`, `APROVADA`, `REJEITADA`.
- `src/patterns/observer/NotificacaoConsoleObservador.ts` — passa a logar
  os novos tipos de evento.
- `src/services/ServicoReservas.ts`:
  - `criarReserva` detecta Laboratórios e cria a reserva como `PENDENTE`
    (sem publicar no calendário até a aprovação).
  - Novos métodos: `listarReservasPendentes`, `aprovarReserva`,
    `rejeitarReserva` — todos delegam a validação da transição ao
    `EstadoReserva` atual.
- `src/index.ts` — duas novas opções no menu (8 = aprovar, 9 = rejeitar).

### Integração com os demais padrões

| Padrão existente | Como interage com State |
|------------------|-------------------------|
| **Adapter** (Google Calendar) | Reservas `PENDENTE` **não** são publicadas no calendário externo. A publicação só ocorre quando o estado transita para `CONFIRMADA` via `aprovarReserva`. |
| **Observer** | Cada transição emite um evento próprio (`PENDENTE_CRIADA`, `APROVADA`, `REJEITADA`), permitindo que assinantes reajam adequadamente. |
| **Singleton** (`RepositorioCampus`) | Continua persistindo a reserva — apenas o valor do campo `status` muda. |
| **Strategy** (política de colisão) | Reservas `PENDENTE` ainda bloqueiam horários para evitar aprovação dupla. |
| **Factory** (`SalaFactory`) | Determina o subtipo de sala (`SalaLaboratorio`) que aciona o fluxo de aprovação no serviço. |

## Como testar

### Cenário 1 — Reserva em sala comum (sem aprovação)

1. Execute `npm run dev`.
2. Opção **2 – Criar reserva** → escolha uma sala não-laboratório (ex.: `s3`).
3. A reserva é criada já como `CONFIRMADA`, com publicação no calendário
   externo aparecendo no log `[GoogleCalendar] createEvent: ...`.

### Cenário 2 — Reserva em laboratório (com aprovação)

1. Opção **2 – Criar reserva** → escolha `s5` (Lab de Informática).
2. A reserva é criada como `PENDENTE`. **Não** aparece linha
   `[GoogleCalendar] createEvent`, pois aguarda aprovação.
3. Log mostra `[NOTIF] Reserva ... aguardando aprovacao`.

### Cenário 3 — Aprovar a reserva pendente

1. Opção **8 – Aprovar reserva pendente**.
2. Selecione a reserva e informe o ID de um usuário com papel `DOCENTE`
   (ex.: `u3`).
3. Status passa para `CONFIRMADA`; o `[GoogleCalendar] createEvent` aparece
   neste momento — sincronização atrasada feita pelo Adapter.

### Cenário 4 — Rejeitar a reserva pendente

1. Crie outra reserva de laboratório.
2. Opção **9 – Rejeitar reserva pendente** → informe ID do docente e o motivo.
3. Status final: `REJEITADA`. Estado terminal — qualquer operação posterior
   sobre essa reserva lança erro descritivo.

### Cenário 5 — Aprovação por estudante (bloqueada)

1. Crie uma reserva de laboratório.
2. Opção **8 – Aprovar reserva pendente** → use ID de um estudante (ex.: `u1`).
3. Erro esperado: `"Apenas docentes podem aprovar reservas."` (validação
   feita dentro de `EstadoPendente.aprovar`).
