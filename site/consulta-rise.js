/*!
 * Consulta de elegibilidade R.I.S.E. · D'Souza Advocacia Empresarial
 * Uso: <div id="consulta-rise" data-contato="URL" data-whatsapp="5561999999999"></div>
 *      <script src=".../consulta-rise.js" defer></script>
 * O navegador baixa só o arquivo dos 2 primeiros dígitos do CNPJ: o servidor não sabe qual empresa foi consultada.
 */
(function () {
  "use strict";
  var SCRIPT = document.currentScript;
  var BASE = (SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/]*$/, "") : "./") + "dados/";

  var CSS = [
    ".rc{--rc-tx:#1d2733;--rc-mut:#5b6673;--rc-bd:#d9dee5;--rc-bg:#fff;--rc-soft:#f5f7fa;--rc-ac:#0f4c81;--rc-red:#a12a2a;--rc-redbg:#fbeeee;--rc-yel:#7a5600;--rc-yelbg:#fff6e0;--rc-grn:#1f6b3a;--rc-grnbg:#ecf7ef;",
    "font:inherit;color:var(--rc-tx);background:var(--rc-bg);border:1px solid var(--rc-bd);border-radius:12px;padding:20px;max-width:760px;margin:24px auto;box-sizing:border-box}",
    ".rc *{box-sizing:border-box}.rc h3{margin:0 0 4px;font-size:1.25em}.rc p{margin:6px 0}",
    ".rc-sub{color:var(--rc-mut);font-size:.92em}",
    ".rc-form{display:flex;gap:8px;margin:14px 0 6px;flex-wrap:wrap}",
    ".rc-form input{flex:1 1 240px;font:inherit;font-size:1.05em;padding:11px 12px;border:1px solid var(--rc-bd);border-radius:8px;min-width:0}",
    ".rc-btn{font:inherit;font-weight:600;padding:11px 18px;border-radius:8px;border:0;background:var(--rc-ac);color:#fff;cursor:pointer;text-decoration:none;display:inline-block}",
    ".rc-btn:hover{filter:brightness(1.1)}.rc-btn.rc-sec{background:transparent;color:var(--rc-ac);border:1px solid var(--rc-ac)}",
    ".rc-msg{margin-top:10px;font-size:.95em;color:var(--rc-red)}",
    ".rc-res{margin-top:16px}.rc-ver{padding:14px 16px;border-radius:10px;margin-bottom:14px}",
    ".rc-ver.r{background:var(--rc-redbg);color:var(--rc-red)}.rc-ver.y{background:var(--rc-yelbg);color:var(--rc-yel)}.rc-ver.g{background:var(--rc-grnbg);color:var(--rc-grn)}",
    ".rc-ver strong{display:block;font-size:1.08em}.rc-ver span{color:var(--rc-tx);font-size:.93em}",
    ".rc-card{border:1px solid var(--rc-bd);border-radius:10px;padding:14px 16px;margin:10px 0;background:var(--rc-soft)}",
    ".rc-card h4{margin:0 0 8px;font-size:1em}.rc-dl{display:grid;grid-template-columns:minmax(120px,170px) 1fr;gap:4px 12px;margin:0;font-size:.93em}",
    ".rc-dl dt{color:var(--rc-mut)}.rc-dl dd{margin:0}",
    ".rc-jan{margin-top:10px;padding:10px 12px;border-left:3px solid var(--rc-ac);background:var(--rc-bg);font-size:.93em}",
    ".rc-cta{margin-top:16px;padding:16px;border-radius:10px;background:var(--rc-soft);display:flex;gap:10px;flex-wrap:wrap;align-items:center}",
    ".rc-cta p{flex:1 1 260px;margin:0}",
    ".rc-aviso{margin-top:14px;font-size:.8em;color:var(--rc-mut);line-height:1.45}",
    "@media (max-width:520px){.rc{padding:16px}.rc-dl{grid-template-columns:1fr}.rc-dl dt{margin-top:6px}}"
  ].join("");

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
  function data(iso) { if (!iso) return null; var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function br(d) { return d ? ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear() : "—"; }
  function maisAnos(d, n) { var x = new Date(d.getTime()); x.setFullYear(x.getFullYear() + n); return x; }
  function dias(a, b) { return Math.round((b - a) / 86400000); }

  function tipo(cat) {
    var c = (cat || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (c.indexOf("inidone") >= 0) return "inidoneidade";
    if (c.indexOf("impedimento") >= 0 || c.indexOf("proibicao de contratar") >= 0) return "impedimento";
    if (c.indexOf("suspens") >= 0) return "suspensao";
    if (c.indexOf("multa") >= 0 || c.indexOf("leniencia") >= 0) return "multa";
    if (c.indexOf("judicial") >= 0 || c.indexOf("improbidade") >= 0) return "judicial";
    return "outra";
  }
  function lei(fund) {
    var f = fund || "";
    if (/14\.?133/.test(f)) return "14133";
    if (/8\.?666/.test(f)) return "8666";
    if (/10\.?520/.test(f)) return "10520";
    if (/12\.?846/.test(f)) return "12846";
    if (/8\.?429/.test(f)) return "8429";
    return "";
  }
  function alcance(s, t) {
    if (s.a) return "Definido em decisão judicial: " + esc(s.a);
    if (t === "inidoneidade") return "Toda a Administração Pública, de todos os entes (União, estados, DF e municípios).";
    if (t === "impedimento") {
      if (lei(s.l) === "10520") return "Sanção do pregão (Lei 10.520). O alcance é discutido; em regra, o ente que aplicou. Confirme na decisão.";
      return "Em regra, só a Administração do ente que aplicou a sanção (Lei 14.133, art. 156, §4º). Com os demais entes, a empresa pode contratar.";
    }
    if (t === "suspensao") return "Em regra, só o órgão ou a entidade que aplicou a sanção (Lei 8.666, art. 87, III).";
    if (t === "multa") return "Multa ou acordo: por si só, não impede de licitar.";
    if (t === "judicial") return "Conforme a decisão judicial.";
    return "A confirmar na decisão.";
  }
  function janela(s, t, hoje) {
    if (t !== "impedimento" && t !== "inidoneidade") return "";
    var ini = data(s.i) || data(s.p);
    if (!ini) return "";
    var l = lei(s.l);
    if (l && l !== "14133") return "Sanção aplicada com base em lei anterior à Lei 14.133. As regras de reabilitação podem ser diferentes; vale analisar o caso.";
    var j = maisAnos(ini, t === "impedimento" ? 1 : 3);
    var fim = data(s.f);
    if (fim && dias(hoje, fim) <= 90) return "";
    var req = " A reabilitação exige, entre outros pontos, reparação integral do dano, pagamento da multa e cumprimento das condições do ato punitivo; em certos casos, programa de integridade (Lei 14.133, art. 163).";
    if (j <= hoje) return "<strong>A Lei 14.133 já permite pedir a reabilitação</strong> (prazo mínimo cumprido em " + br(j) + ")." + req;
    return "A Lei 14.133 permite pedir a reabilitação a partir de <strong>" + br(j) + "</strong>." + req;
  }

  var NOMES = { inidoneidade: "Declaração de inidoneidade", impedimento: "Impedimento de licitar e contratar",
                suspensao: "Suspensão", multa: "Multa / acordo", judicial: "Proibição por decisão judicial", outra: "Sanção" };

  function veredito(lista) {
    var ts = lista.map(function (s) { return tipo(s.c); });
    if (!lista.length) return { c: "g", t: "Nenhuma sanção vigente no CEIS ou no CNEP para este CNPJ.",
      d: "Isso não cobre outros cadastros (por exemplo, a lista de inidôneos do TCU, o SICAF ou cadastros estaduais)." };
    if (ts.indexOf("inidoneidade") >= 0) return { c: "r", t: "Há declaração de inidoneidade vigente.",
      d: "Enquanto durar, a empresa não pode licitar nem contratar com nenhum órgão público do país." };
    if (ts.some(function (t) { return t === "impedimento" || t === "suspensao" || t === "judicial"; }))
      return { c: "y", t: "Há sanção vigente que restringe licitações.",
        d: "Na maior parte dos casos, a restrição vale perante quem aplicou a sanção, não perante toda a Administração. Veja o alcance abaixo." };
    return { c: "y", t: "Há registro no CNEP, sem impedimento de licitar.", d: "Multas e acordos não impedem a participação por si sós, mas aparecem em análises de habilitação e de integridade." };
  }

  function evento(nome, params) { try { if (window.gtag) window.gtag("event", nome, params || {}); } catch (e) {} }

  function montar(raiz) {
    var contato = raiz.getAttribute("data-contato") || "https://rise.dssouza.com/";
    var whats = digitos(raiz.getAttribute("data-whatsapp"));
    var titulo = raiz.getAttribute("data-titulo") || "Consulta de elegibilidade para licitações";
    if (!document.getElementById("rc-css")) {
      var st = document.createElement("style"); st.id = "rc-css"; st.textContent = CSS; document.head.appendChild(st);
    }
    raiz.className += " rc";
    raiz.innerHTML =
      '<h3>' + esc(titulo) + '</h3>' +
      '<p class="rc-sub">Digite o CNPJ para ver se há sanção vigente no CEIS ou no CNEP, o alcance e quando a reabilitação pode ser pedida.</p>' +
      '<form class="rc-form" novalidate><label class="rc-sub" style="position:absolute;left:-9999px" for="rc-cnpj">CNPJ</label>' +
      '<input id="rc-cnpj" inputmode="numeric" autocomplete="off" placeholder="00.000.000/0000-00" maxlength="18" aria-label="CNPJ">' +
      '<button class="rc-btn" type="submit">Consultar</button></form>' +
      '<div class="rc-msg" role="alert" aria-live="polite"></div><div class="rc-res" aria-live="polite"></div>' +
      '<p class="rc-aviso">Dados públicos do Portal da Transparência (CEIS e CNEP)<span class="rc-atual"></span>. ' +
      'A consulta é feita no seu navegador: o CNPJ digitado não é enviado nem armazenado. As informações têm caráter ' +
      'informativo e não substituem a leitura do ato punitivo nem a análise jurídica do caso.</p>';
    var input = raiz.querySelector("input"), msg = raiz.querySelector(".rc-msg"), res = raiz.querySelector(".rc-res");
    var cache = {};

    fetch(BASE + "meta.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (m) {
      var d = data((m.data_referencia || "").slice(0, 10));
      if (d) raiz.querySelector(".rc-atual").textContent = ", atualizados em " + br(d);
    }).catch(function () {});

    input.addEventListener("input", function () { input.value = mascara(input.value); });
    raiz.querySelector("form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var c = digitos(input.value);
      msg.textContent = ""; res.innerHTML = "";
      if (!cnpjValido(c)) { msg.textContent = "CNPJ inválido. Confira os 14 dígitos."; return; }
      res.innerHTML = '<p class="rc-sub">Consultando…</p>';
      var pref = c.slice(0, 2);
      var p = cache[pref] || (cache[pref] = fetch(BASE + pref + ".json").then(function (r) {
        if (!r.ok) throw new Error(r.status); return r.json();
      }));
      p.then(function (base) { mostrar(c, base[c]); }).catch(function () {
        delete cache[pref]; res.innerHTML = ""; msg.textContent = "Não foi possível consultar agora. Tente novamente em instantes.";
      });
    });

    function mostrar(c, emp) {
      var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      var lista = emp ? emp.s : [];
      var v = veredito(lista);
      evento("consulta_elegibilidade", { resultado: lista.length ? "com_sancao" : "sem_sancao" });
      var h = '<div class="rc-ver ' + v.c + '"><strong>' + esc(v.t) + '</strong><span>' + esc(v.d) + '</span></div>';
      if (emp) h += '<p><strong>' + esc(emp.n) + '</strong> · ' + esc(mascara(c)) + '</p>';
      lista.forEach(function (s) {
        var t = tipo(s.c), fim = data(s.f), jan = janela(s, t, hoje);
        var prazo = fim ? br(fim) + " (faltam " + dias(hoje, fim) + " dias)" : "Sem data final informada";
        h += '<div class="rc-card"><h4>' + esc(NOMES[t]) + ' · ' + esc(s.b) + '</h4><dl class="rc-dl">' +
          '<dt>Órgão sancionador</dt><dd>' + esc(s.o) + (s.u ? " (" + esc(s.u) + ")" : "") + '</dd>' +
          (s.e ? '<dt>Esfera</dt><dd>' + esc(s.e.charAt(0) + s.e.slice(1).toLowerCase()) + '</dd>' : "") +
          '<dt>Alcance</dt><dd>' + alcance(s, t) + '</dd>' +
          '<dt>Início</dt><dd>' + br(data(s.i)) + '</dd><dt>Fim</dt><dd>' + esc(prazo) + '</dd>' +
          (s.l ? '<dt>Fundamento</dt><dd>' + esc(s.l) + '</dd>' : "") +
          (s.m ? '<dt>Valor da multa</dt><dd>R$ ' + esc(s.m) + '</dd>' : "") +
          '</dl>' + (jan ? '<div class="rc-jan">' + jan + '</div>' : "") + '</div>';
      });
      if (lista.length) {
        var url = contato + (contato.indexOf("?") >= 0 ? "&" : "?") + "cnpj=" + c + "&origem=consulta";
        h += '<div class="rc-cta"><p>Quer entender o que essa sanção significa para os seus contratos e o caminho para recuperar a elegibilidade?</p>' +
          '<a class="rc-btn rc-cta-link" href="' + esc(url) + '">Falar com um advogado</a>' +
          (whats ? '<a class="rc-btn rc-sec rc-cta-whats" target="_blank" rel="noopener" href="https://wa.me/' + whats +
            '?text=' + encodeURIComponent("Olá! Fiz a consulta de elegibilidade do CNPJ " + mascara(c) + " e gostaria de entender minhas opções.") + '">WhatsApp</a>' : "") +
          '</div>';
      }
      res.innerHTML = h;
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
