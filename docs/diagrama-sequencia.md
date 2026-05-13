# Diagrama de Sequência — Fluxo de `criarReserva`

```mermaid
sequenceDiagram
    actor Cliente
    participant Servico as ServicoReservas
    participant Repo as RepositorioCampus
    participant Politica as PoliticaDeReserva
    participant Centro as CentroEventosReserva
    participant Obs1 as NotificacaoConsoleObservador
    participant Obs2 as CacheRelatorioObservador

    Cliente->>+Servico: criarReserva(salaId, usuarioId, inicio, fim)

    Servico->>+Repo: runExclusive(fn)
    Note over Repo: mutex garante thread-safety

    Repo->>Repo: obterUsuario(usuarioId)
    Repo->>Repo: obterSala(salaId)
    Repo->>Repo: listarReservasNaSala(salaId)

    Servico->>+Politica: avaliar(candidata, outrasNaSala, usuario, obterUsuario)
    Politica-->>-Servico: ResultadoPolitica { permitido, cancelarIds }

    alt nao permitido
        Servico-->>Cliente: throws Error(motivo)
    else permitido com cancelamentos
        loop para cada id em cancelarIds
            Servico->>Repo: salvarReserva(cancelada)
            Servico->>Centro: notificar(CANCELADA)
            Centro->>Obs1: atualizar(evento, centro)
            Centro->>Obs2: atualizar(evento, centro)
            Obs2->>+Centro: snapshotConfirmadas() [pull]
            Centro-->>-Obs2: Reserva[]
        end
        Servico->>Repo: salvarReserva(nova)
        Servico->>Centro: notificar(CRIADA)
        Centro->>Obs1: atualizar(evento, centro)
        Centro->>Obs2: atualizar(evento, centro)
        Servico-->>-Repo: fim runExclusive
        Repo-->>-Servico: nova Reserva
        Servico-->>-Cliente: Reserva criada
    end
```

## Notas

- **Push**: `CentroEventosReserva` entrega o `EventoReserva` diretamente a cada observador via `atualizar`.
- **Pull**: dentro do `atualizar`, o observador chama `centro.snapshotConfirmadas()` para obter o estado atual completo.
- **Thread-safety**: `RepositorioCampus.runExclusive` serializa operacoes assincronas via fila de Promises.
