// Testes da lógica da página (site/consulta-rise.js). Rodar: node --test tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const c = require("../site/consulta-rise.js");

const HOJE = new Date(2026, 10, 10);                       // 10/11/2026
const reab = (s) => c.reabilitacao(s, c.tipo(s.c), HOJE);

test("inidoneidade da Lei 8.666 sem data final: vale até a reabilitação, possível após 2 anos", () => {
  const s = { c: "Declaração de Inidoneidade", i: "2026-05-13", f: null, l: "LEI 8666 - ART. 87, IV" };
  const r = reab(s);
  assert.strictEqual(r.caso, "futura");
  assert.strictEqual(r.quando.getFullYear(), 2028);
  assert.match(r.texto, /não tem data para acabar/);
  assert.match(r.texto, /13\/05\/2028/);
  assert.match(r.texto, /art\. 87, IV e §3º/);
  assert.strictEqual(c.prazo(s, "inidoneidade", HOJE), "Sem data final: vale até a reabilitação");
});

test("inidoneidade da Lei 8.666 aplicada há mais de 2 anos: reabilitação já pode ser requerida", () => {
  const r = reab({ c: "Declaração de Inidoneidade", i: "2024-01-10", f: null, l: "Lei 8.666, art. 87, IV" });
  assert.strictEqual(r.caso, "aberta");
  assert.match(r.texto, /já pode ser requerida/);
});

test("janela de reabilitação igual ao fim da sanção não é apresentada como oportunidade", () => {
  const r = reab({ c: "Impedimento", i: "2026-03-30", f: "2027-03-30", l: "LEI 14133 - ART. 156, III" });
  assert.strictEqual(r.caso, "sem_ganho");
  assert.match(r.texto, /se encerra pelo fim do prazo/);
  assert.doesNotMatch(r.texto, /permite pedir/);
  assert.match(r.texto, /o ponto a examinar é o alcance/);          // não vende reabilitação, mas diz o que vale analisar
});

test("botão de contato: âncora fica na página; em URL, o CNPJ entra antes do #", () => {
  assert.strictEqual(c.linkContato("#contato", "11222333000181"), "#contato");
  assert.strictEqual(c.linkContato("https://rise.dssouza.com/", "11222333000181"),
    "https://rise.dssouza.com/?cnpj=11222333000181&origem=consulta");
  assert.strictEqual(c.linkContato("https://rise.dssouza.com/?utm=x#contato", "11222333000181"),
    "https://rise.dssouza.com/?utm=x&cnpj=11222333000181&origem=consulta#contato");
});

test("impedimento de 3 anos da Lei 14.133: reabilitação em 1 ano e ganho em meses", () => {
  const r = reab({ c: "Impedimento", i: "2026-03-31", f: "2029-03-31", l: "LEI 14133 - ART. 156, §4º" });
  assert.strictEqual(r.caso, "futura");
  assert.match(r.texto, /a partir de 31\/03\/2027/);
  assert.match(r.texto, /antecipa o retorno em até 24 meses/);
});

test("impedimento da Lei 14.133 com prazo mínimo já cumprido", () => {
  const r = reab({ c: "Impedimento", i: "2025-06-01", f: "2028-06-01", l: "Lei 14.133" });
  assert.strictEqual(r.caso, "aberta");
  assert.match(r.texto, /já permite pedir/);
});

test("sem lei identificada, não se afirma regra de reabilitação", () => {
  assert.strictEqual(reab({ c: "Impedimento", i: "2026-03-31", f: "2029-03-31", l: "" }), null);
  assert.strictEqual(reab({ c: "Suspensão", i: "2026-03-31", f: "2027-03-31", l: "Lei 8.666" }), null);
});

test("prazo acima do máximo legal é sinalizado; dentro do máximo, não", () => {
  const susp = { c: "Suspensão", i: "2024-11-18", f: "2027-11-18", l: "LEI 8666 - ART. 87, II E III" };
  assert.deepStrictEqual(c.excesso(susp, "suspensao"), { anos: 3, max: 2, lei: "Lei 8.666" });
  assert.strictEqual(c.excesso({ c: "Suspensão", i: "2025-01-01", f: "2027-01-01", l: "Lei 8.666" }, "suspensao"), null);
  assert.strictEqual(c.excesso({ c: "Impedimento", i: "2026-03-31", f: "2029-03-31", l: "Lei 14133" }, "impedimento"), null);
  assert.ok(c.excesso({ c: "Impedimento", i: "2026-01-01", f: "2031-01-01", l: "Lei 14133" }, "impedimento"));
});

test("fundamento com duas leis de licitação é ambíguo: não se sinaliza excesso", () => {
  const s = { c: "Suspensão", i: "2024-11-18", f: "2027-11-18", l: "Lei 8.666, art. 87; Lei 14.133, art. 156" };
  assert.strictEqual(c.leiLicitacao(s.l), "");
  assert.strictEqual(c.excesso(s, "suspensao"), null);
});

test("destaque da inidoneidade não é categórico", () => {
  const v = c.veredito([{ c: "Declaração de Inidoneidade" }]);
  assert.strictEqual(v.c, "r");
  assert.match(v.d, /^Em regra/);
});

test("multa: separador de milhar, e valor zero não aparece", () => {
  assert.strictEqual(c.moeda("33383,77"), "33.383,77");
  assert.strictEqual(c.moeda("1.250.000,00"), "1.250.000,00");
  assert.strictEqual(c.moeda("150000.5"), "150.000,50");
  assert.strictEqual(c.moeda("0,00"), "");
  assert.strictEqual(c.moeda(""), "");
});

test("resumo conta os registros por tipo", () => {
  const l = ["Impedimento", "Impedimento", "Impedimento", "Impedimento", "Suspensão", "Declaração de Inidoneidade", "Multa", "Outra"]
    .map((x) => ({ c: x }));
  assert.strictEqual(c.resumo(l),
    "8 registros vigentes: 1 declaração de inidoneidade, 4 impedimentos, 1 suspensão, 2 outros registros.");
  assert.strictEqual(c.resumo([{ c: "Multa" }]), "");
});

test("fundamento sai da caixa alta sem perder numerais romanos nem 'Lei'", () => {
  assert.strictEqual(c.frase("LEI 14133 - ART. 156, III - IMPEDIMENTO DE LICITAR E CONTRATAR"),
    "Lei 14133 - Art. 156, III - Impedimento de licitar e contratar");
  assert.match(c.frase("INCISOS II, III, IV, V, VI E VII DO CAPUT"), /incisos II, III, IV, V, VI e VII do caput/i);
});

test("sanção genérica da Lei 12.846 recebe nome próprio", () => {
  assert.strictEqual(c.nome({ l: "LEI 12846 - ART. 5º" }, "outra"), "Sanção da Lei Anticorrupção");
  assert.strictEqual(c.nome({ l: "" }, "outra"), "Sanção");
});

test("linha do tempo: marca da reabilitação entre início e fim; sem marca quando não há ganho", () => {
  const a = c.linhaDoTempo({ c: "Impedimento", i: "2026-03-31", f: "2029-03-31", l: "Lei 14133" }, "impedimento", HOJE);
  assert.ok(a.marca > 30 && a.marca < 36);
  assert.ok(a.decorrido > 15 && a.decorrido < 25);
  assert.strictEqual(a.aberto, false);
  const b = c.linhaDoTempo({ c: "Impedimento", i: "2026-03-30", f: "2027-03-30", l: "Lei 14133" }, "impedimento", HOJE);
  assert.strictEqual(b.marca, null);
  const d = c.linhaDoTempo({ c: "Declaração de Inidoneidade", i: "2026-05-13", f: null, l: "Lei 8666" }, "inidoneidade", HOJE);
  assert.strictEqual(d.aberto, true);
  assert.ok(d.marca > 60 && d.marca < 70);
});

test("pasta dos dados sai do endereço do script, com ou sem ?ver=", () => {
  assert.strictEqual(c.baseDeScript("https://x.github.io/rise-consulta/consulta-rise.js"),
    "https://x.github.io/rise-consulta/dados/");
  assert.strictEqual(c.baseDeScript("https://x.github.io/rise-consulta/consulta-rise.js?ver=1.1.0"),
    "https://x.github.io/rise-consulta/dados/");
  assert.strictEqual(c.baseDeScript("https://x.github.io/rise-consulta/consulta-rise.js#x"),
    "https://x.github.io/rise-consulta/dados/");
  assert.strictEqual(c.baseDeScript("/js/consulta-rise.js"), "/js/dados/");
});

test("CNPJ: validação e máscara", () => {
  assert.ok(c.cnpjValido("31797544000150"));
  assert.ok(!c.cnpjValido("31797544000151"));
  assert.strictEqual(c.mascara("31797544000150"), "31.797.544/0001-50");
});
