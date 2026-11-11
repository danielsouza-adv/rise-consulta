/*!
 * Consulta de elegibilidade R.I.S.E. · D'Souza Advocacia Empresarial
 * Uso: <div id="consulta-rise" data-contato="URL" data-whatsapp="5561999999999"></div>
 *      <script src=".../consulta-rise.js" defer></script>
 * O navegador baixa só o arquivo dos 2 primeiros dígitos do CNPJ: o servidor não sabe qual empresa foi consultada.
 *
 * A primeira metade deste arquivo é lógica pura (sem tela), testada em tests/test_consulta.js.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ utilidades */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function digitos(s) { return String(s || "").replace(/\D/g, ""); }
  function cnpjValido(c) {
    if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
    function dv(base) {
      var pesos = base.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2], soma = 0;
      for (var i = 0; i < base.length; i++) soma += +base[i] * pesos[i];
      var r = soma % 11; return r < 2 ? 0 : 11 - r;
    }
    return dv(c.slice(0, 12)) === +c[12] && dv(c.slice(0, 13)) === +c[13];
  }
  function mascara(c) {
    c = digitos(c).slice(0, 14);
    return c.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  function data(iso) { if (!iso) return null; var p = String(iso).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function br(d) { return d ? ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear() : "—"; }
  function maisAnos(d, n) { var x = new Date(d.getTime()); x.setFullYear(x.getFullYear() + n); return x; }
  function dias(a, b) { return Math.round((b - a) / 86400000); }

  /** "33383,77" -> "33.383,77"; zero ou vazio -> "" (não se mostra multa de R$ 0,00). */
  function moeda(v) {
    var s = String(v == null ? "" : v).trim().replace(/[^\d.,-]/g, "");
    if (!s) return "";
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    var n = parseFloat(s);
    if (!isFinite(n) || n <= 0) return "";
    var p = n.toFixed(2).split(".");
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1];
  }

  /** Tira o texto legal da caixa alta, preservando numerais romanos, "Lei" e início de frase. */
  function frase(txt) {
    var romano = /^m{0,3}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;
    var s = String(txt || "").toLowerCase().replace(/\s+/g, " ").trim();
    s = s.replace(/[a-zà-ú]+/g, function (w) {
      if (w === "lei" || w === "leis") return "L" + w.slice(1);
      if (w.length <= 4 && romano.test(w) && w !== "mil" && w !== "e" && w !== "a" && w !== "o") return w.toUpperCase();
      return w;
    });
    return s.replace(/(^|[.;:]\s+|-\s+)([a-zà-ú])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }

  /* ------------------------------------------------------------------ regras */

  function tipo(cat) {
    var c = (cat || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (c.indexOf("inidone") >= 0) return "inidoneidade";
    if (c.indexOf("impedimento") >= 0 || c.indexOf("proibicao de contratar") >= 0) return "impedimento";
    if (c.indexOf("suspens") >= 0) return "suspensao";
    if (c.indexOf("multa") >= 0 || c.indexOf("leniencia") >= 0) return "multa";
    if (c.indexOf("judicial") >= 0 || c.indexOf("improbidade") >= 0) return "judicial";
    return "outra";
  }

  /** Todas as leis citadas no fundamento, na ordem de prioridade. */
  function leis(fund) {
    var f = fund || "", r = [];
    if (/14\.?133/.test(f)) r.push("14133");
    if (/8\.?666/.test(f)) r.push("8666");
    if (/10\.?520/.test(f)) r.push("10520");
    if (/12\.?846/.test(f)) r.push("12846");
    if (/8\.?429/.test(f)) r.push("8429");
    return r;
  }
  function lei(fund) { return leis(fund)[0] || ""; }
  /** Lei de licitação do fundamento, só quando há exatamente uma (sem ambiguidade). */
  function leiLicitacao(fund) {
    var l = leis(fund).filter(function (x) { return x === "14133" || x === "8666" || x === "10520"; });
    return l.length === 1 ? l[0] : "";
  }

  var NOME_LEI = { "14133": "Lei 14.133", "8666": "Lei 8.666", "10520": "Lei 10.520" };
  /* Prazo máximo, em anos, que a lei admite para cada sanção. */
  var MAXIMO = { "suspensao|8666": 2, "impedimento|14133": 3, "impedimento|10520": 5, "inidoneidade|14133": 6 };

  var NOMES = { inidoneidade: "Declaração de inidoneidade", impedimento: "Impedimento de licitar e contratar",
                suspensao: "Suspensão", multa: "Multa ou acordo", judicial: "Proibição por decisão judicial", outra: "Sanção" };

  function nome(s, t) {
    if (t === "outra" && lei(s.l) === "12846") return "Sanção da Lei Anticorrupção";
    return NOMES[t];
  }

  function alcance(s, t) {
    if (s.a) return "Definido em decisão judicial: " + s.a;
    if (t === "inidoneidade") return "Em regra, toda a Administração Pública, de todos os entes (União, estados, DF e municípios).";
    if (t === "impedimento") {
      if (lei(s.l) === "10520") return "Sanção do pregão (Lei 10.520). O alcance é discutido; em regra, o ente que aplicou. Confirme na decisão.";
      return "Em regra, só a Administração do ente que aplicou a sanção (Lei 14.133, art. 156, §4º). Com os demais entes, a empresa pode contratar.";
    }
    if (t === "suspensao") return "Em regra, só o órgão ou a entidade que aplicou a sanção (Lei 8.666, art. 87, III).";
    if (t === "multa") return "Multa ou acordo: por si só, não impede de licitar.";
    if (t === "judicial") return "Conforme a decisão judicial.";
    return "A confirmar na decisão.";
  }

  /** Prazo registrado acima do máximo legal? Devolve {anos, max, lei} ou null. */
  function excesso(s, t) {
    var l = leiLicitacao(s.l), max = MAXIMO[t + "|" + l];
    var ini = data(s.i), fim = data(s.f);
    if (!max || !ini || !fim) return null;
    if (dias(maisAnos(ini, max), fim) <= 31) return null;          // tolerância de um mês para datas de cadastro
    return { anos: Math.round(dias(ini, fim) / 365.25 * 10) / 10, max: max, lei: NOME_LEI[l] };
  }

  /**
   * Situação da reabilitação. Devolve null (nada a dizer) ou
   * { caso, quando: Date|null, texto: string (texto puro; a data relevante vai em `destaque`) }.
   */
  function reabilitacao(s, t, hoje) {
    if (t !== "impedimento" && t !== "inidoneidade") return null;
    var ini = data(s.i) || data(s.p), fim = data(s.f), l = lei(s.l);
    if (!ini) return null;
    var REQ = " O pedido exige, entre outros pontos, reparação integral do dano, pagamento da multa e cumprimento das " +
              "condições do ato punitivo; em certas infrações, também programa de integridade (Lei 14.133, art. 163).";

    if (l === "8666" && t === "inidoneidade") {
      var j8 = maisAnos(ini, 2);
      var base = fim ? "Pela Lei 8.666, a reabilitação " : "Pela Lei 8.666, a declaração de inidoneidade não tem data para acabar: vale até a reabilitação, que ";
      var cond = " (art. 87, IV e §3º), mediante ressarcimento dos prejuízos à Administração.";
      if (j8 <= hoje) return { caso: "aberta", quando: j8, texto: base + "já pode ser requerida: os 2 anos da aplicação se completaram em " + br(j8) + cond };
      return { caso: "futura", quando: j8, texto: base + "pode ser requerida após 2 anos da aplicação, a partir de " + br(j8) + cond };
    }
    if (l === "10520") return { caso: "sem_regra", quando: null,
      texto: "A Lei 10.520 não traz regra própria de reabilitação; em regra, a restrição termina no fim do prazo. Vale analisar o caso." };
    if (l !== "14133") return l ? { caso: "lei_anterior", quando: null,
      texto: "Sanção aplicada com base em lei anterior à Lei 14.133. As regras de reabilitação são diferentes; vale analisar o caso." } : null;

    var j = maisAnos(ini, t === "impedimento" ? 1 : 3);
    if (fim && dias(j, fim) <= 30) return { caso: "sem_ganho", quando: j,
      texto: "Esta sanção termina em " + br(fim) + ", junto ou antes do prazo mínimo para pedir a reabilitação (" + br(j) +
             "): aqui, a restrição se encerra pelo fim do prazo." +
             (t === "impedimento" ? " Até lá, o ponto a examinar é o alcance: em regra, ela só vale perante o ente que a aplicou, " +
              "e a empresa pode disputar contratos dos demais." : "") };
    var ganho = fim ? Math.floor(dias(j > hoje ? j : hoje, fim) / 30) : 0;
    var antecipa = ganho >= 1 ? " Deferida, antecipa o retorno em até " + ganho + (ganho === 1 ? " mês." : " meses.") : "";
    if (j <= hoje) return { caso: "aberta", quando: j,
      texto: "A Lei 14.133 já permite pedir a reabilitação: o prazo mínimo se completou em " + br(j) + "." + antecipa + REQ };
    return { caso: "futura", quando: j,
      texto: "A Lei 14.133 permite pedir a reabilitação a partir de " + br(j) + "." + antecipa + REQ };
  }

  /** Posições (0–100) da linha do tempo de uma sanção; null quando não há datas para desenhar. */
  function linhaDoTempo(s, t, hoje) {
    var ini = data(s.i), fim = data(s.f), r = reabilitacao(s, t, hoje);
    if (!ini) return null;
    var termino = fim || (r && r.quando && (r.caso === "aberta" || r.caso === "futura") ? maisAnos(r.quando, 1) : null);
    if (!termino || termino <= ini) return null;
    var total = termino - ini;
    function pos(d) { return Math.max(0, Math.min(100, Math.round((d - ini) / total * 1000) / 10)); }
    var marca = r && r.quando && (r.caso === "aberta" || r.caso === "futura") && r.quando > ini && r.quando < termino ? pos(r.quando) : null;
    return { decorrido: pos(hoje), marca: marca, aberto: !fim };
  }

  function prazo(s, t, hoje) {
    var fim = data(s.f);
    if (fim) { var d = dias(hoje, fim); return br(fim) + (d > 1 ? " (faltam " + d + " dias)" : d === 1 ? " (falta 1 dia)" : " (termina hoje)"); }
    if (t === "inidoneidade" && lei(s.l) === "8666") return "Sem data final: vale até a reabilitação";
    return "Sem data final informada";
  }

  function veredito(lista) {
    var ts = lista.map(function (s) { return tipo(s.c); });
    if (!lista.length) return { c: "g", t: "Nenhuma sanção vigente no CEIS ou no CNEP para este CNPJ.",
      d: "Isso não cobre outros cadastros, como a lista de inidôneos do TCU, o SICAF ou cadastros estaduais." };
    if (ts.indexOf("inidoneidade") >= 0) return { c: "r", t: "Há declaração de inidoneidade vigente.",
      d: "Em regra, enquanto ela durar, a empresa não pode licitar nem contratar com a Administração Pública de nenhum ente." };
    if (ts.some(function (t) { return t === "impedimento" || t === "suspensao" || t === "judicial"; }))
      return { c: "y", t: "Há sanção vigente que restringe licitações.",
        d: "Na maior parte dos casos, a restrição vale perante quem aplicou a sanção, não perante toda a Administração. Veja o alcance de cada registro." };
    return { c: "y", t: "Há registro no CNEP, sem impedimento de licitar.",
      d: "Multas e acordos não impedem a participação por si sós, mas aparecem em análises de habilitação e de integridade." };
  }

  var PLURAL = { inidoneidade: ["declaração de inidoneidade", "declarações de inidoneidade"], impedimento: ["impedimento", "impedimentos"],
                 suspensao: ["suspensão", "suspensões"], judicial: ["proibição judicial", "proibições judiciais"] };
  /** "8 registros vigentes: 1 declaração de inidoneidade, 4 impedimentos, 1 suspensão, 2 no CNEP" */
  function resumo(lista) {
    if (lista.length < 2) return "";
    var n = {}, cnep = 0;
    lista.forEach(function (s) { var t = tipo(s.c); if (PLURAL[t]) n[t] = (n[t] || 0) + 1; else cnep++; });
    var partes = ["inidoneidade", "impedimento", "suspensao", "judicial"].filter(function (t) { return n[t]; })
      .map(function (t) { return n[t] + " " + PLURAL[t][n[t] > 1 ? 1 : 0]; });
    if (cnep) partes.push(cnep + (cnep > 1 ? " outros registros" : " outro registro"));
    return lista.length + " registros vigentes: " + partes.join(", ") + ".";
  }

  /** Destino do botão de contato. "#secao" fica na mesma página; em URL, o CNPJ entra antes do "#". */
  function linkContato(contato, cnpj) {
    if (contato.charAt(0) === "#") return contato;
    var i = contato.indexOf("#"), base = i >= 0 ? contato.slice(0, i) : contato, hash = i >= 0 ? contato.slice(i) : "";
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + "cnpj=" + cnpj + "&origem=consulta" + hash;
  }

  var API = { cnpjValido: cnpjValido, mascara: mascara, moeda: moeda, frase: frase, tipo: tipo, leis: leis, lei: lei,
              leiLicitacao: leiLicitacao, nome: nome, alcance: alcance, excesso: excesso, reabilitacao: reabilitacao,
              linhaDoTempo: linhaDoTempo, prazo: prazo, linkContato: linkContato, veredito: veredito, resumo: resumo, data: data };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ tela */

  var SCRIPT = document.currentScript;
  var BASE = (SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/]*$/, "") : "./") + "dados/";
  var FONTE = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap";

  var CSS = [
    /* tinta, papel e ouro: as mesmas três matérias de um documento oficial */
    ".rc{--rc-ink:#000;--rc-ink2:#1a1a1a;--rc-gold:#c8a96e;--rc-goldtx:#7a5c1e;--rc-paper:#fff;--rc-wash:#f7f4ee;--rc-line:#e2dccd;",
    "--rc-tx:#1a2b3c;--rc-mut:#5b6b78;--rc-red:#8f2a2a;--rc-redbg:#fbf1f0;--rc-yel:#7a5200;--rc-yelbg:#fff8e8;--rc-grn:#1d6341;--rc-grnbg:#eef7f1;",
    "--rc-serif:'Playfair Display','Iowan Old Style','Palatino Linotype',Georgia,serif;",
    "all:revert;display:block;box-sizing:border-box;max-width:780px;margin:32px auto;font-family:var(--rc-font,inherit);font-size:var(--rc-size,16px);line-height:1.55;color:var(--rc-tx);",
    "background:var(--rc-paper);border:1px solid var(--rc-line);border-radius:6px;overflow:hidden;box-shadow:0 30px 60px -38px rgba(0,0,0,.55);text-align:left}",
    ".rc *,.rc *::before,.rc *::after{box-sizing:border-box}",
    ".rc :where(p,h3,h4,dl,dd,dt){margin:0;padding:0}",

    /* cabeçalho */
    ".rc-topo{background:var(--rc-ink);color:#fff;padding:30px 32px 28px;border-bottom:3px solid var(--rc-gold)}",
    ".rc h3.rc-tit{font-family:var(--rc-serif);font-weight:600;font-size:1.688em;line-height:1.2;color:#fff}",
    ".rc-topo .rc-sub{color:#c9c9c9;font-size:0.938em;margin-top:8px;max-width:56ch}",
    ".rc-form{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap}",
    ".rc-form input{flex:1 1 250px;min-width:0;font:inherit;font-size:1.125em;letter-spacing:.02em;font-variant-numeric:tabular-nums;color:var(--rc-ink);",
    "background:#fff;border:1px solid transparent;border-radius:4px;padding:13px 15px;margin:0;height:auto;box-shadow:none}",
    ".rc-form input::placeholder{color:#9aa5b5}",
    ".rc-btn{font:inherit;font-size:1em;font-weight:600;line-height:1.2;padding:14px 24px;border-radius:4px;border:1px solid var(--rc-gold);background:var(--rc-gold);",
    "color:var(--rc-ink);cursor:pointer;text-decoration:none;display:inline-block;text-align:center;transition:background .15s,border-color .15s}",
    ".rc-btn:hover{background:#e8cc7a;border-color:#e8cc7a;color:var(--rc-ink)}",
    ".rc-btn.rc-sec{background:transparent;color:#fff;border-color:rgba(255,255,255,.45)}.rc-btn.rc-sec:hover{border-color:#fff;background:transparent;color:#fff}",
    ".rc-form input:focus-visible,.rc-btn:focus-visible,.rc summary:focus-visible{outline:2px solid var(--rc-gold);outline-offset:2px}",
    ".rc-msg{color:#ffd9d4;font-size:0.938em;margin-top:10px;min-height:0}.rc-msg:empty{display:none}",

    /* resultado */
    ".rc-res:empty{display:none}.rc-res{padding:28px 32px 4px}",
    ".rc-carga{color:var(--rc-mut)}",
    ".rc-ver{padding:16px 18px;border-left:4px solid;border-radius:0 4px 4px 0}",
    ".rc-ver.r{background:var(--rc-redbg);border-color:var(--rc-red)}.rc-ver.y{background:var(--rc-yelbg);border-color:#c08a12}.rc-ver.g{background:var(--rc-grnbg);border-color:var(--rc-grn)}",
    ".rc-ver strong{display:block;font-family:var(--rc-serif);font-weight:600;font-size:1.25em;line-height:1.3}",
    ".rc-ver.r strong{color:var(--rc-red)}.rc-ver.y strong{color:var(--rc-yel)}.rc-ver.g strong{color:var(--rc-grn)}",
    ".rc-ver span{display:block;margin-top:4px;font-size:0.938em}",
    ".rc-emp{margin-top:24px;padding-bottom:16px;border-bottom:1px solid var(--rc-ink)}",
    ".rc-emp b{display:block;font-family:var(--rc-serif);font-weight:600;font-size:1.375em;line-height:1.25;color:var(--rc-ink)}",
    ".rc-emp span{display:block;color:var(--rc-mut);font-size:0.938em;font-variant-numeric:tabular-nums;margin-top:2px}",
    ".rc-emp em{display:block;font-style:normal;font-size:0.938em;margin-top:10px}",

    /* cada registro é uma entrada de um extrato, não um cartão */
    ".rc-reg{padding:22px 0;border-bottom:1px solid var(--rc-line)}",
    ".rc-cab{display:flex;justify-content:space-between;align-items:baseline;gap:12px}",
    ".rc h4.rc-nome{font-family:var(--rc-serif);font-weight:600;font-size:1.125em;line-height:1.3;color:var(--rc-ink)}",
    ".rc-base{flex:none;font-size:0.812em;color:var(--rc-mut);border:1px solid var(--rc-line);border-radius:3px;padding:1px 7px}",
    ".rc-dl{display:grid;grid-template-columns:150px 1fr;gap:6px 16px;margin-top:12px;font-size:0.938em}",
    ".rc-dl dt{color:var(--rc-mut)}",

    /* linha do tempo: decorrido em tinta, janela de reabilitação em ouro */
    ".rc-lt{margin-top:18px}",
    ".rc-lt-m{position:relative;height:20px;font-size:0.812em;color:var(--rc-goldtx);font-weight:600}",
    ".rc-lt-m span{position:absolute;bottom:2px;white-space:nowrap;transform:translateX(-50%)}",
    ".rc-lt-m span.e{transform:none}.rc-lt-m span.d{transform:translateX(-100%)}",
    ".rc-lt-t{position:relative;height:6px;background:#e6e0d2;border-radius:3px}",
    ".rc-lt-t.a{border-radius:3px 0 0 3px;background:linear-gradient(90deg,#e6e0d2 70%,rgba(230,224,210,0))}",
    ".rc-lt-t i{position:absolute;left:0;top:0;bottom:0;background:var(--rc-ink2);border-radius:3px}",
    ".rc-lt-t b{position:absolute;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;background:var(--rc-gold);border:2px solid #fff;transform:rotate(45deg)}",
    ".rc-lt-d{display:flex;justify-content:space-between;font-size:0.812em;color:var(--rc-mut);margin-top:6px;font-variant-numeric:tabular-nums}",

    ".rc-nota{margin-top:14px;padding:12px 14px;background:var(--rc-wash);border-left:3px solid var(--rc-gold);font-size:0.938em}",
    ".rc-nota.s{border-left-color:#bdb49f}",
    ".rc-alerta{margin-top:10px;padding:12px 14px;background:var(--rc-yelbg);border-left:3px solid #c08a12;font-size:0.938em}",
    ".rc-alerta b{color:var(--rc-yel)}",
    ".rc details{margin-top:12px;font-size:0.875em}",
    ".rc summary{cursor:pointer;color:var(--rc-goldtx);font-weight:600;width:fit-content}",
    ".rc details p{margin-top:8px;color:var(--rc-mut);line-height:1.6}",

    /* chamada */
    ".rc-cta{margin:26px -32px 0;padding:26px 32px;background:var(--rc-ink);color:#fff;display:flex;gap:14px 20px;flex-wrap:wrap;align-items:center}",
    ".rc-cta p{flex:1 1 280px;font-family:var(--rc-serif);font-weight:600;font-size:1.188em;line-height:1.35;color:#fff}",
    ".rc-cta .rc-acoes{display:flex;gap:10px;flex-wrap:wrap}",
    ".rc-aviso{padding:18px 32px 22px;font-size:0.812em;line-height:1.55;color:var(--rc-mut)}",

    "@media (max-width:560px){.rc{margin:20px auto}.rc-topo{padding:24px 20px 22px}.rc h3.rc-tit{font-size:1.438em}.rc-res{padding:22px 20px 4px}",
    ".rc-dl{grid-template-columns:1fr;gap:2px}.rc-dl dt{margin-top:8px;font-size:0.812em}.rc-cta{margin:22px -20px 0;padding:22px 20px}.rc-aviso{padding:16px 20px 20px}",
    ".rc-btn{flex:1 1 auto}.rc-cta .rc-acoes{width:100%}}",
    "@media (prefers-reduced-motion:reduce){.rc-btn{transition:none}}"
  ].join("");

  function evento(nomeEv, params) { try { if (window.gtag) window.gtag("event", nomeEv, params || {}); } catch (e) {} }

  function htmlLinha(lt, s, r) {
    if (!lt) return "";
    var rot = "";
    if (lt.marca != null) {
      var cls = lt.marca < 35 ? "e" : lt.marca > 60 ? "d" : "";
      rot = '<span class="' + cls + '" style="left:' + lt.marca + '%">Reabilitação possível em ' + esc(br(r.quando)) + '</span>';
    }
    return '<div class="rc-lt" aria-hidden="true"><div class="rc-lt-m">' + rot + '</div>' +
      '<div class="rc-lt-t' + (lt.aberto ? " a" : "") + '"><i style="width:' + lt.decorrido + '%"></i>' +
      (lt.marca != null ? '<b style="left:' + lt.marca + '%"></b>' : "") + '</div>' +
      '<div class="rc-lt-d"><span>Início ' + esc(br(data(s.i))) + '</span><span>' +
      (lt.aberto ? "Sem data final" : "Fim " + esc(br(data(s.f)))) + '</span></div></div>';
  }

  function htmlRegistro(s, hoje) {
    var t = tipo(s.c), r = reabilitacao(s, t, hoje), ex = excesso(s, t), multa = moeda(s.m);
    var h = '<div class="rc-reg"><div class="rc-cab"><h4 class="rc-nome">' + esc(nome(s, t)) + '</h4><span class="rc-base">' + esc(s.b) + '</span></div>' +
      '<dl class="rc-dl"><dt>Órgão sancionador</dt><dd>' + esc(s.o) + (s.u ? " (" + esc(s.u) + ")" : "") + '</dd>' +
      (s.e ? '<dt>Esfera</dt><dd>' + esc(s.e.charAt(0) + s.e.slice(1).toLowerCase()) + '</dd>' : "") +
      '<dt>Alcance</dt><dd>' + esc(alcance(s, t)) + '</dd>' +
      '<dt>Vigência</dt><dd>' + esc(prazo(s, t, hoje)) + '</dd>' +
      (multa ? '<dt>Valor da multa</dt><dd>R$ ' + esc(multa) + '</dd>' : "") +
      (s.n ? '<dt>Processo</dt><dd>' + esc(s.n) + '</dd>' : "") + '</dl>' +
      htmlLinha(linhaDoTempo(s, t, hoje), s, r);
    if (r) h += '<p class="rc-nota' + (r.caso === "aberta" || r.caso === "futura" ? "" : " s") + '">' + esc(r.texto) + '</p>';
    if (ex) h += '<p class="rc-alerta"><b>Prazo acima do previsto em lei.</b> O registro indica cerca de ' + String(ex.anos).replace(".", ",") +
      ' anos, e a ' + esc(ex.lei) + ' admite no máximo ' + ex.max + ' para esta sanção. Pode ser erro de cadastro ou excesso do ato: vale conferir a decisão.</p>';
    if (s.l) h += '<details><summary>Fundamento legal registrado</summary><p>' + esc(frase(s.l)) + '</p></details>';
    return h + '</div>';
  }

  function montar(raiz) {
    var contato = raiz.getAttribute("data-contato") || "https://rise.dssouza.com/";
    var whats = digitos(raiz.getAttribute("data-whatsapp"));
    var titulo = raiz.getAttribute("data-titulo") || "Consulta de elegibilidade para licitações";
    if (!document.getElementById("rc-css")) {
      var st = document.createElement("style"); st.id = "rc-css"; st.textContent = CSS; document.head.appendChild(st);
      if (raiz.getAttribute("data-fontes") !== "nao") {
        var lk = document.createElement("link"); lk.rel = "stylesheet"; lk.href = FONTE; document.head.appendChild(lk);
      }
    }
    raiz.className += " rc";
    raiz.innerHTML =
      '<div class="rc-topo"><h3 class="rc-tit">' + esc(titulo) + '</h3>' +
      '<p class="rc-sub">Digite o CNPJ para ver se há sanção vigente no CEIS ou no CNEP, onde ela impede de licitar e quando a reabilitação pode ser pedida.</p>' +
      '<form class="rc-form" novalidate>' +
      '<input id="rc-cnpj" inputmode="numeric" autocomplete="off" placeholder="00.000.000/0000-00" maxlength="18" aria-label="CNPJ da empresa">' +
      '<button class="rc-btn" type="submit">Consultar</button></form>' +
      '<div class="rc-msg" role="alert" aria-live="polite"></div></div>' +
      '<div class="rc-res" aria-live="polite"></div>' +
      '<p class="rc-aviso">Dados públicos do Portal da Transparência (CEIS e CNEP)<span class="rc-atual"></span>. ' +
      'A consulta é feita no seu navegador: o CNPJ digitado não é enviado nem armazenado. As informações têm caráter ' +
      'informativo e não substituem a leitura do ato punitivo nem a análise jurídica do caso.</p>';
    var input = raiz.querySelector("input"), msg = raiz.querySelector(".rc-msg"), res = raiz.querySelector(".rc-res");
    var cache = {};

    fetch(BASE + "meta.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (m) {
      var d = data((m.data_base || m.data_referencia || "").slice(0, 10));
      if (d) raiz.querySelector(".rc-atual").textContent = ", base de " + br(d);
    }).catch(function () {});

    input.addEventListener("input", function () { input.value = mascara(input.value); });
    raiz.querySelector("form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var c = digitos(input.value);
      msg.textContent = ""; res.innerHTML = "";
      if (!cnpjValido(c)) { msg.textContent = "Este CNPJ não é válido. Confira os 14 dígitos."; return; }
      res.innerHTML = '<p class="rc-carga">Consultando…</p>';
      var pref = c.slice(0, 2);
      var p = cache[pref] || (cache[pref] = fetch(BASE + pref + ".json").then(function (r) {
        if (!r.ok) throw new Error(r.status); return r.json();
      }));
      p.then(function (base) { mostrar(c, base[c]); }).catch(function () {
        delete cache[pref]; res.innerHTML = ""; msg.textContent = "A base não respondeu. Tente consultar de novo em instantes.";
      });
    });

    function mostrar(c, emp) {
      var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      var lista = emp ? emp.s : [];
      var v = veredito(lista), rs = resumo(lista);
      evento("consulta_elegibilidade", { resultado: lista.length ? "com_sancao" : "sem_sancao" });
      var h = '<div class="rc-ver ' + v.c + '"><strong>' + esc(v.t) + '</strong><span>' + esc(v.d) + '</span></div>';
      if (emp) h += '<div class="rc-emp"><b>' + esc(emp.n) + '</b><span>CNPJ ' + esc(mascara(c)) + '</span>' + (rs ? '<em>' + esc(rs) + '</em>' : "") + '</div>';
      lista.forEach(function (s) { h += htmlRegistro(s, hoje); });
      if (lista.length) {
        var url = linkContato(contato, c);
        h += '<div class="rc-cta"><p>O que estes registros significam para os seus contratos, e qual o caminho para voltar a licitar.</p>' +
          '<div class="rc-acoes"><a class="rc-btn rc-cta-link" href="' + esc(url) + '">Pedir análise do caso</a>' +
          (whats ? '<a class="rc-btn rc-sec rc-cta-whats" target="_blank" rel="noopener" href="https://wa.me/' + whats +
            '?text=' + encodeURIComponent("Olá! Fiz a consulta de elegibilidade do CNPJ " + mascara(c) + " e gostaria de entender minhas opções.") + '">WhatsApp</a>' : "") +
          '</div></div>';
      }
      res.innerHTML = h;
      /* A página que hospeda a consulta pode ouvir o resultado (por exemplo, para preencher o formulário). */
      try { document.dispatchEvent(new CustomEvent("consulta-rise:resultado", { detail: { cnpj: c, empresa: emp ? emp.n : "",
        registros: lista.length, tipos: lista.map(function (s) { return tipo(s.c); }) } })); } catch (e) {}
      Array.prototype.forEach.call(res.querySelectorAll(".rc-cta a"), function (a) {
        a.addEventListener("click", function () { evento("clique_contato_consulta", { canal: a.classList.contains("rc-cta-whats") ? "whatsapp" : "formulario" }); });
      });
    }
  }

  function iniciar() {
    var alvos = document.querySelectorAll("#consulta-rise, [data-consulta-rise]");
    Array.prototype.forEach.call(alvos, function (el) { if (!el.getAttribute("data-rc-ok")) { el.setAttribute("data-rc-ok", "1"); montar(el); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
