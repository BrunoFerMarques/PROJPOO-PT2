/**
 * Testes das politicas de reserva (Strategy) e integracao com ServicoReservas.
 *
 * Executar: npm test
 *
 * Cobre:
 * - PoliticaPrimeiroAReservar: sem conflito, com conflito, reserva cancelada,
 *   intervalos adjacentes, ignorarReservaId (usado em alteracao).
 * - PoliticaPrioridadeDocente: docente vs estudante, estudante vs docente,
 *   docente vs docente, conflito com a propria reserva, multiplas reservas
 *   conflitantes canceladas em cascata.
 * - ServicoReservas: criar, alterar, cancelar, salas disponiveis, relatorio diario.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { Reserva } from "../domain/Reserva.js";
import { Usuario } from "../domain/Usuario.js";
import { SalaFactory } from "../patterns/factory/SalaFactory.js";
import { RepositorioCampus } from "../patterns/singleton/RepositorioCampus.js";
import { CentroEventosReserva } from "../patterns/observer/CentroEventosReserva.js";
import {
  PoliticaPrimeiroAReservar,
  PoliticaPrioridadeDocente,
} from "../patterns/strategy/PoliticaDeReserva.js";
import { ServicoReservas } from "../services/ServicoReservas.js";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de construcao
// ──────────────────────────────────────────────────────────────────────────────

function dataEm(h: number, m = 0): Date {
  const d = new Date("2026-06-01T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

function novaReserva(
  id: string,
  salaId: string,
  usuarioId: string,
  hIni: number,
  hFim: number,
  status: "CONFIRMADA" | "CANCELADA" = "CONFIRMADA"
) {
  return new Reserva(id, salaId, usuarioId, dataEm(hIni), dataEm(hFim), status);
}

const ana = new Usuario("ana", "Ana", "ESTUDANTE");
const bruno = new Usuario("bruno", "Bruno", "ESTUDANTE");
const profCarlos = new Usuario("carlos", "Prof. Carlos", "DOCENTE");
const profDaniela = new Usuario("dani", "Prof. Daniela", "DOCENTE");

const tabelaUsuarios = new Map([
  [ana.id, ana],
  [bruno.id, bruno],
  [profCarlos.id, profCarlos],
  [profDaniela.id, profDaniela],
]);

const obterUsuario = (id: string) => tabelaUsuarios.get(id);

// ══════════════════════════════════════════════════════════════════════════════
// Politica: PRIMEIRO A RESERVAR
// ══════════════════════════════════════════════════════════════════════════════

describe("PoliticaPrimeiroAReservar", () => {
  const politica = new PoliticaPrimeiroAReservar();

  test("permite quando nao ha reservas existentes", () => {
    const candidata = novaReserva("r1", "s1", ana.id, 9, 11);
    const res = politica.avaliar(candidata, [], ana, obterUsuario);
    assert.equal(res.permitido, true);
    assert.deepEqual(res.cancelarIds, []);
  });

  test("permite quando intervalos sao adjacentes (sem sobreposicao)", () => {
    const existente = novaReserva("r1", "s1", bruno.id, 9, 11);
    const candidata = novaReserva("r2", "s1", ana.id, 11, 13);
    const res = politica.avaliar(candidata, [existente], ana, obterUsuario);
    assert.equal(res.permitido, true);
  });

  test("bloqueia quando ha sobreposicao com reserva confirmada", () => {
    const existente = novaReserva("r1", "s1", bruno.id, 9, 11);
    const candidata = novaReserva("r2", "s1", ana.id, 10, 12);
    const res = politica.avaliar(candidata, [existente], ana, obterUsuario);
    assert.equal(res.permitido, false);
    assert.match(res.motivo ?? "", /primeiro a reservar/i);
  });

  test("ignora reservas canceladas (nao bloqueia)", () => {
    const cancelada = novaReserva("r1", "s1", bruno.id, 9, 11, "CANCELADA");
    const candidata = novaReserva("r2", "s1", ana.id, 9, 11);
    const res = politica.avaliar(candidata, [cancelada], ana, obterUsuario);
    assert.equal(res.permitido, true);
  });

  test("ignora a propria reserva ao alterar (ignorarReservaId)", () => {
    // simula o cenario de alteracao: a reserva existente eh a propria que esta sendo alterada
    const reservaAtual = novaReserva("r1", "s1", ana.id, 9, 11);
    const reservaAlterada = novaReserva("r1", "s1", ana.id, 10, 12);
    const res = politica.avaliar(
      reservaAlterada,
      [reservaAtual],
      ana,
      obterUsuario,
      "r1"
    );
    assert.equal(res.permitido, true);
  });

  test("nao retorna ids para cancelar (politica nao cancela ninguem)", () => {
    const existente = novaReserva("r1", "s1", bruno.id, 9, 11);
    const candidata = novaReserva("r2", "s1", ana.id, 10, 12);
    const res = politica.avaliar(candidata, [existente], ana, obterUsuario);
    assert.deepEqual(res.cancelarIds, []);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Politica: PRIORIDADE DOCENTE
// ══════════════════════════════════════════════════════════════════════════════

describe("PoliticaPrioridadeDocente", () => {
  const politica = new PoliticaPrioridadeDocente();

  test("permite estudante quando nao ha conflito", () => {
    const candidata = novaReserva("r1", "s1", ana.id, 9, 11);
    const res = politica.avaliar(candidata, [], ana, obterUsuario);
    assert.equal(res.permitido, true);
    assert.deepEqual(res.cancelarIds, []);
  });

  test("permite docente quando nao ha conflito", () => {
    const candidata = novaReserva("r1", "s1", profCarlos.id, 9, 11);
    const res = politica.avaliar(candidata, [], profCarlos, obterUsuario);
    assert.equal(res.permitido, true);
  });

  test("bloqueia estudante quando colide com reserva de outro estudante", () => {
    const existente = novaReserva("r1", "s1", bruno.id, 9, 11);
    const candidata = novaReserva("r2", "s1", ana.id, 10, 12);
    const res = politica.avaliar(candidata, [existente], ana, obterUsuario);
    assert.equal(res.permitido, false);
    assert.match(res.motivo ?? "", /colis/i);
  });

  test("bloqueia estudante quando colide com reserva de docente", () => {
    const existente = novaReserva("r1", "s1", profCarlos.id, 9, 11);
    const candidata = novaReserva("r2", "s1", ana.id, 10, 12);
    const res = politica.avaliar(candidata, [existente], ana, obterUsuario);
    assert.equal(res.permitido, false);
    assert.match(res.motivo ?? "", /docente/i);
  });

  test("bloqueia estudante com mensagem clara quando conflita com sua propria reserva", () => {
    const existente = novaReserva("r1", "s1", ana.id, 9, 11);
    const candidata = novaReserva("r2", "s1", ana.id, 10, 12);
    const res = politica.avaliar(candidata, [existente], ana, obterUsuario);
    assert.equal(res.permitido, false);
    assert.match(res.motivo ?? "", /sua/i);
  });

  test("docente preempta reserva de estudante e marca para cancelar", () => {
    const estudanteOcupando = novaReserva("r1", "s1", ana.id, 9, 11);
    const candidata = novaReserva("r2", "s1", profCarlos.id, 10, 12);
    const res = politica.avaliar(
      candidata,
      [estudanteOcupando],
      profCarlos,
      obterUsuario
    );
    assert.equal(res.permitido, true);
    assert.deepEqual(res.cancelarIds, ["r1"]);
  });

  test("docente preempta MULTIPLAS reservas de estudantes simultaneamente", () => {
    const r1 = novaReserva("r1", "s1", ana.id, 9, 10);
    const r2 = novaReserva("r2", "s1", bruno.id, 10, 11);
    const candidata = novaReserva("r3", "s1", profCarlos.id, 9, 11);
    const res = politica.avaliar(candidata, [r1, r2], profCarlos, obterUsuario);
    assert.equal(res.permitido, true);
    assert.deepEqual(res.cancelarIds.sort(), ["r1", "r2"]);
  });

  test("docente bloqueado ao tentar colidir com reserva de outro docente", () => {
    const outroDocente = novaReserva("r1", "s1", profDaniela.id, 9, 11);
    const candidata = novaReserva("r2", "s1", profCarlos.id, 10, 12);
    const res = politica.avaliar(
      candidata,
      [outroDocente],
      profCarlos,
      obterUsuario
    );
    assert.equal(res.permitido, false);
    assert.deepEqual(res.cancelarIds, []);
  });

  test("docente bloqueado ao colidir com sua propria reserva", () => {
    const propria = novaReserva("r1", "s1", profCarlos.id, 9, 11);
    const candidata = novaReserva("r2", "s1", profCarlos.id, 10, 12);
    const res = politica.avaliar(
      candidata,
      [propria],
      profCarlos,
      obterUsuario
    );
    assert.equal(res.permitido, false);
    assert.match(res.motivo ?? "", /sua/i);
  });

  test("ignora reservas canceladas", () => {
    const cancelada = novaReserva("r1", "s1", bruno.id, 9, 11, "CANCELADA");
    const candidata = novaReserva("r2", "s1", ana.id, 9, 11);
    const res = politica.avaliar(candidata, [cancelada], ana, obterUsuario);
    assert.equal(res.permitido, true);
  });

  test("ignora a propria reserva ao alterar (ignorarReservaId)", () => {
    const atual = novaReserva("r1", "s1", profCarlos.id, 9, 11);
    const alterada = novaReserva("r1", "s1", profCarlos.id, 10, 12);
    const res = politica.avaliar(
      alterada,
      [atual],
      profCarlos,
      obterUsuario,
      "r1"
    );
    assert.equal(res.permitido, true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Integracao: ServicoReservas com cada politica
// ══════════════════════════════════════════════════════════════════════════════

describe("ServicoReservas — integracao", () => {
  let repo: RepositorioCampus;
  let centro: CentroEventosReserva;
  let servico: ServicoReservas;
  const factory = new SalaFactory();

  beforeEach(() => {
    RepositorioCampus.resetForTests();
    repo = RepositorioCampus.getInstance();
    repo.salvarSala(factory.criar("INDIVIDUAL", "s1", "Cubiculo 1", 1));
    repo.salvarSala(factory.criar("GRUPO", "s2", "Sala Grupo", 8));
    repo.salvarSala(factory.criar("LABORATORIO", "s3", "Lab", 20));
    repo.salvarUsuario(ana);
    repo.salvarUsuario(bruno);
    repo.salvarUsuario(profCarlos);

    centro = new CentroEventosReserva(repo);
    servico = new ServicoReservas(repo, centro, new PoliticaPrimeiroAReservar());
  });

  test("RF-01: lista todas as salas quando nao ha reservas", () => {
    const livres = servico.salasDisponiveisNoIntervalo(dataEm(9), dataEm(11));
    assert.equal(livres.length, 3);
  });

  test("RF-01: nao lista sala ocupada no intervalo", async () => {
    await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    const livres = servico.salasDisponiveisNoIntervalo(dataEm(10), dataEm(12));
    const ids = livres.map((s) => s.id).sort();
    assert.deepEqual(ids, ["s2", "s3"]);
  });

  test("RF-01: lista sala apos cancelamento", async () => {
    const r = await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    await servico.cancelarReserva(r.id, ana.id);
    const livres = servico.salasDisponiveisNoIntervalo(dataEm(9), dataEm(11));
    assert.equal(livres.length, 3);
  });

  test("RF-02: cria reserva com sucesso", async () => {
    const r = await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    assert.equal(r.salaId, "s1");
    assert.equal(r.usuarioId, ana.id);
    assert.equal(r.status, "CONFIRMADA");
  });

  test("RF-02: rejeita reserva com sala inexistente", async () => {
    await assert.rejects(
      servico.criarReserva("sX", ana.id, dataEm(9), dataEm(11)),
      /sala/i
    );
  });

  test("RF-02: rejeita reserva com usuario inexistente", async () => {
    await assert.rejects(
      servico.criarReserva("s1", "naoexiste", dataEm(9), dataEm(11)),
      /usu/i
    );
  });

  test("RF-02: altera horario da reserva", async () => {
    const r = await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    const alterada = await servico.alterarReserva(r.id, ana.id, {
      inicio: dataEm(13),
      fim: dataEm(15),
    });
    assert.equal(alterada.inicio.getHours(), 13);
    assert.equal(alterada.fim.getHours(), 15);
  });

  test("RF-02: rejeita alteracao por nao-titular", async () => {
    const r = await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    await assert.rejects(
      servico.alterarReserva(r.id, bruno.id, { inicio: dataEm(13), fim: dataEm(15) }),
      /titular/i
    );
  });

  test("RF-02: rejeita cancelamento por nao-titular", async () => {
    const r = await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    await assert.rejects(servico.cancelarReserva(r.id, bruno.id), /titular/i);
  });

  test("RF-02: cancelamento eh idempotente (cancelar duas vezes nao quebra)", async () => {
    const r = await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    await servico.cancelarReserva(r.id, ana.id);
    // segunda vez nao lanca
    await servico.cancelarReserva(r.id, ana.id);
    const atual = repo.obterReserva(r.id);
    assert.equal(atual?.status, "CANCELADA");
  });

  test("RF-03: primeiro a reservar bloqueia segunda tentativa", async () => {
    await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    await assert.rejects(
      servico.criarReserva("s1", bruno.id, dataEm(10), dataEm(12)),
      /colis/i
    );
  });

  test("RF-03: troca de politica em tempo de execucao (Strategy)", async () => {
    await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));

    // primeira politica bloqueia
    await assert.rejects(
      servico.criarReserva("s1", profCarlos.id, dataEm(10), dataEm(12))
    );

    // troca politica
    servico.definirPolitica(new PoliticaPrioridadeDocente());

    // agora docente consegue preemptar
    const r = await servico.criarReserva(
      "s1",
      profCarlos.id,
      dataEm(10),
      dataEm(12)
    );
    assert.equal(r.status, "CONFIRMADA");

    // reserva da Ana foi cancelada automaticamente
    const todas = repo.listarReservasNaSala("s1");
    const daAna = todas.find((x) => x.usuarioId === ana.id);
    assert.equal(daAna?.status, "CANCELADA");
  });

  test("RF-04: observer recebe evento ao criar reserva", async () => {
    const eventos: string[] = [];
    centro.anexar({
      atualizar: (e) => {
        eventos.push(e.tipo);
      },
    });
    await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    assert.deepEqual(eventos, ["CRIADA"]);
  });

  test("RF-04: observer recebe ALTERADA com antes e depois", async () => {
    const r = await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    let antesH = -1;
    let depoisH = -1;
    centro.anexar({
      atualizar: (e) => {
        if (e.tipo === "ALTERADA") {
          antesH = e.antes.inicio.getHours();
          depoisH = e.depois.inicio.getHours();
        }
      },
    });
    await servico.alterarReserva(r.id, ana.id, {
      inicio: dataEm(13),
      fim: dataEm(15),
    });
    assert.equal(antesH, 9);
    assert.equal(depoisH, 13);
  });

  test("RF-04: docente preemptando dispara CANCELADA + CRIADA", async () => {
    const eventos: string[] = [];
    centro.anexar({ atualizar: (e) => eventos.push(e.tipo) });

    servico.definirPolitica(new PoliticaPrioridadeDocente());
    await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    await servico.criarReserva("s1", profCarlos.id, dataEm(10), dataEm(12));

    // 1: CRIADA (Ana), 2: CANCELADA (Ana, preemptada), 3: CRIADA (Carlos)
    assert.deepEqual(eventos, ["CRIADA", "CANCELADA", "CRIADA"]);
  });

  test("RF-05: relatorio diario agrupa reservas por sala", async () => {
    await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    await servico.criarReserva("s1", bruno.id, dataEm(14), dataEm(16));
    await servico.criarReserva("s2", profCarlos.id, dataEm(13), dataEm(15));

    const rel = servico.relatorioDiarioPorSala(dataEm(12));
    assert.equal(rel.get("s1")?.length, 2);
    assert.equal(rel.get("s2")?.length, 1);
    assert.equal(rel.get("s3")?.length, 0);
  });

  test("RF-05: relatorio diario lista em ordem crescente de inicio", async () => {
    await servico.criarReserva("s1", ana.id, dataEm(14), dataEm(15));
    await servico.criarReserva("s1", bruno.id, dataEm(9), dataEm(10));

    const rel = servico.relatorioDiarioPorSala(dataEm(12));
    const lista = rel.get("s1")!;
    assert.equal(lista[0].inicio.getHours(), 9);
    assert.equal(lista[1].inicio.getHours(), 14);
  });

  test("RF-05: relatorio nao inclui reservas canceladas", async () => {
    const r = await servico.criarReserva("s1", ana.id, dataEm(9), dataEm(11));
    await servico.cancelarReserva(r.id, ana.id);

    const rel = servico.relatorioDiarioPorSala(dataEm(12));
    assert.equal(rel.get("s1")?.length, 0);
  });
});
