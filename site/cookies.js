/*
 * Aviso de cookies da D'Souza Advocacia Empresarial (danielssouza.com e rise.dssouza.com).
 *
 * - Google: modo de consentimento v2. Medição de audiência (Analytics) segue ativa; cookies de anúncio
 *   (Google Ads) só com aceite. O padrão "denied" é gravado pelo trecho do <head> (cookies-cabecalho.html),
 *   antes do GTM e do gtag; este arquivo só atualiza depois da escolha.
 * - Meta: o Pixel guarda os eventos numa fila e o script da Meta só carrega depois do aceite.
 * - A escolha fica no navegador por 12 meses. Qualquer link para "#cookies" (ou com data-cookies) reabre o aviso.
 * - Posição: rodapé no computador, TOPO em telas até 820px. No celular o rodapé é onde ficam os
 *   controles que convertem (o botão "Consultar" no site, a barra fixa na LP), e o aviso os cobria.
 *
 * Uso: <script src=".../cookies.js" data-pixel="ID_DO_PIXEL" data-politica="URL" defer></script>
 *
 * SEM "?v=" de propósito. O cache-buster manual parecia mais seguro e era o contrário: em
 * 27/11/2026 um deploy do Pages falhou sem avisar, o navegador pediu "?v=2", recebeu o arquivo
 * ANTIGO e guardou aquilo em cache sob a URL nova. A versão foi queimada enquanto o conteúdo
 * ainda era o velho, e a correção ficou invisível para quem tinha aberto a página na janela da
 * falha. Além disso, cada mudança aqui obrigava a recolar o bloco no WordPress à mão.
 * Sem query, o Pages serve com cache curto e a mudança chega sozinha em poucos minutos.
 */
(function () {
  if (window.dsouzaCookies) return;
  var CHAVE = "dsouza_cookies", VALIDADE = 365 * 864e5;
  var eu = document.currentScript;
  var pixel = eu && eu.getAttribute("data-pixel");
  var politica = (eu && eu.getAttribute("data-politica")) || "https://danielssouza.com/politica-de-privacidade/";

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function ler() {
    try {
      var v = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (v && (v.e === "aceito" || v.e === "recusado") && Date.now() - v.t < VALIDADE) return v.e;
    } catch (e) {}
    return null;
  }
  function gravar(e) {
    try { localStorage.setItem(CHAVE, JSON.stringify({ e: e, t: Date.now() })); } catch (x) {}
  }

  // Pixel em fila: init e PageView já entram, mas nada sai do navegador sem o script da Meta.
  if (pixel && !window.fbq) {
    var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    window.fbq("init", pixel);
    window.fbq("track", "PageView");
  }
  var pixelCarregado = false;

  function aplicar(e) {
    var a = e === "aceito" ? "granted" : "denied";
    gtag("consent", "update", { ad_storage: a, ad_user_data: a, ad_personalization: a });
    gtag("set", "ads_data_redaction", a !== "granted");
    if (a === "granted" && pixel && !pixelCarregado) {
      pixelCarregado = true;
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);
    }
    try { window.dataLayer.push({ event: "cookies_escolha", cookies_anuncios: a }); } catch (x) {}
  }

  // O tema do site usa !important em button/p/a; por isso todas as regras do aviso também levam !important.
  var FONTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
  var CSS =
    "#dsz-ck{position:fixed;left:16px;right:16px;bottom:16px;top:auto;z-index:2147483000;width:auto;max-width:680px;margin:0 auto;" +
    "box-sizing:border-box;padding:18px 20px;background:#111;color:#f2f2f2;border:1px solid #2a2a2a;border-top:3px solid #c8a96e;" +
    "border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.35);font-family:" + FONTE + ";font-size:14px;line-height:1.5;text-align:left}" +
    "#dsz-ck p{margin:0 0 14px;padding:0;color:#f2f2f2;font-family:" + FONTE + ";font-size:14px;font-weight:400;line-height:1.5;" +
    "letter-spacing:normal;text-align:left;text-transform:none}" +
    "#dsz-ck a{color:#e8cc7a;text-decoration:underline;font-size:inherit;font-weight:inherit}" +
    "#dsz-ck .dsz-bt{display:flex;flex-direction:row;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin:0;padding:0}" +
    "#dsz-ck button{appearance:none;-webkit-appearance:none;display:inline-block;box-sizing:border-box;cursor:pointer;" +
    "width:auto;min-width:132px;height:auto;min-height:0;margin:0;padding:10px 18px;border-radius:6px;box-shadow:none;" +
    "text-align:center;text-transform:none;letter-spacing:normal;text-decoration:none;transition:none;" +
    "font-family:" + FONTE + ";font-size:14px;font-weight:600;line-height:1.2}" +
    "#dsz-ck button:focus-visible{outline:2px solid #e8cc7a;outline-offset:2px}" +
    "#dsz-ck button.dsz-nao{background:transparent;border:1px solid #c8a96e;color:#e8cc7a}" +
    "#dsz-ck button.dsz-sim{background:#c8a96e;border:1px solid #c8a96e;color:#111}" +
    "#dsz-ck button.dsz-nao:hover{background:rgba(200,169,110,.12);color:#e8cc7a}" +
    "#dsz-ck button.dsz-sim:hover{background:#d6b97f;border-color:#d6b97f;color:#111}" +
    // No celular o aviso vai para o TOPO. No rodapé ele cobria o botão "Consultar" da ferramenta
    // (danielssouza.com, depois que a consulta subiu para a primeira dobra) e a barra fixa de ações
    // (rise.dssouza.com) — justamente para o visitante de primeira viagem, que é quem vem do anúncio.
    "@media (max-width:820px){#dsz-ck{left:12px;right:12px;top:12px;bottom:auto;padding:16px}" +
    "#dsz-ck button{flex:1 1 0;min-width:0}}";
  // acrescenta !important a cada declaração (só os blocos internos, sem mexer em seletores e @media)
  CSS = CSS.replace(/\{([^{}]*)\}/g, function (m, corpo) {
    return "{" + corpo.split(";").filter(function (d) { return d.trim(); })
      .map(function (d) { return d + " !important"; }).join(";") + "}";
  });

  var caixa = null;
  function fechar() { if (caixa && caixa.parentNode) caixa.parentNode.removeChild(caixa); caixa = null; }
  function escolher(e) { gravar(e); aplicar(e); fechar(); }

  function abrir() {
    if (caixa) return;
    if (!document.getElementById("dsz-ck-css")) {
      var st = document.createElement("style");
      st.id = "dsz-ck-css";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    caixa = document.createElement("div");
    caixa.id = "dsz-ck";
    caixa.setAttribute("role", "dialog");
    caixa.setAttribute("aria-label", "Aviso de cookies");
    caixa.innerHTML =
      "<p>Usamos cookies para medir as visitas ao site. Com a sua permissão, também usamos cookies do Google e da Meta " +
      "para medir os nossos anúncios. Saiba mais na <a href=\"" + politica + "\" target=\"_blank\" rel=\"noopener\">Política de Privacidade</a>.</p>" +
      "<div class=\"dsz-bt\"><button type=\"button\" class=\"dsz-nao\">Recusar</button>" +
      "<button type=\"button\" class=\"dsz-sim\">Aceitar</button></div>";
    caixa.querySelector(".dsz-nao").addEventListener("click", function () { escolher("recusado"); });
    caixa.querySelector(".dsz-sim").addEventListener("click", function () { escolher("aceito"); });
    document.body.appendChild(caixa);
  }

  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[href$="#cookies"],[data-cookies]');
    if (!a) return;
    ev.preventDefault();
    abrir();
  });

  window.dsouzaCookies = { abrir: abrir, estado: ler };

  var atual = ler();
  if (atual) aplicar(atual);
  else if (document.body) abrir();
  else document.addEventListener("DOMContentLoaded", abrir);
})();
