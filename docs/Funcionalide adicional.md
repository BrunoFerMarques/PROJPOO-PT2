# Funcionalidade Adicional: Integração com Calendário Externo

## Descrição

Ao confirmar, alterar ou cancelar uma reserva, o sistema publica automaticamente
o evento em um serviço de calendário externo (Google Calendar). Isso permite que
o usuário visualize suas reservas diretamente na agenda pessoal, sem precisar
consultar o sistema manualmente.

## Padrão de Projeto: Adapter

### Justificativa

A Google Calendar API possui uma interface completamente diferente do domínio da
aplicação: seus métodos recebem parâmetros como `summary`, `start.dateTime` e
`timeZone`, enquanto o sistema trabalha com objetos `Reserva`, `Usuario` e `Sala`.

O padrão **Adapter** resolve essa incompatibilidade sem modificar nenhuma das duas
partes: cria-se uma interface intermediária (`CalendarioService`) que o
`ServicoReservas` conhece, e o `GoogleCalendarAdapter` faz a tradução para o
formato que a API externa exige.

Trocar de provedor de calendário (ex.: iCal, Outlook) significa apenas criar um
novo Adapter — nenhum outro arquivo do sistema precisa ser alterado.

### Participantes

| Papel GoF      | Classe/Interface do projeto       |
|----------------|-----------------------------------|
| Target         | `CalendarioService` (interface)   |
| Adaptee        | `GoogleCalendarAPI` (classe)      |
| Adapter        | `GoogleCalendarAdapter` (classe)  |
| Client         | `ServicoReservas`                 |

### Arquivos criados

```
src/patterns/adapter/
  CalendarioService.ts       ← interface Target
  GoogleCalendarAPI.ts       ← classe Adaptee (API externa simulada)
  GoogleCalendarAdapter.ts   ← Adapter
```

### Arquivos modificados

- `src/services/ServicoReservas.ts` — recebe `CalendarioService` como dependência
  opcional no construtor; chama `publicarReserva` e `removerReserva` nos três
  métodos de ciclo de vida da reserva.
- `src/index.ts` — instancia `GoogleCalendarAdapter` e injeta no `ServicoReservas`.

## Como testar

1. Execute `npm start` (ou `npx ts-node src/index.ts`).
2. Escolha a opção **2 – Criar reserva** e preencha os dados.
3. Observe no console a linha `[GoogleCalendar] createEvent: "Reserva — <nome da sala>"`,
   confirmando que o Adapter foi acionado.
4. Escolha a opção **4 – Cancelar reserva** e confirme; a linha
   `[GoogleCalendar] deleteEvent: gcal-...` aparecerá, indicando remoção do evento.
5. Ao alterar uma reserva (opção 3), o evento antigo é removido e um novo é criado.