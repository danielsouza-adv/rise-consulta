# Consulta de elegibilidade R.I.S.E.

Consulta pública e gratuita por CNPJ: há sanção vigente no **CEIS** ou no **CNEP**? Qual o alcance, até quando vale e quando a reabilitação pode ser pedida (Lei 14.133, art. 163)?

Uma iniciativa da **D'Souza Advocacia Empresarial** · Dr. Daniel de Souza · OAB/DF 71.124.

## Como funciona

- Todo dia, o GitHub roda `gerar_dados.py`, que baixa as bases oficiais do CEIS e do CNEP (Portal da Transparência) e gera 100 arquivos pequenos, um para cada par de dígitos iniciais do CNPJ.
- A página baixa só o arquivo dos 2 primeiros dígitos do CNPJ digitado. **O servidor não sabe qual empresa foi consultada**, e nada é armazenado.
- Só empresas: registros de pessoa física (CPF) nunca entram nos dados publicados.
- Tudo é estático (GitHub Pages): sem servidor, sem banco de dados, sem custo.

## Instalação (uma vez)

1. **Ativar o GitHub Pages**: no repositório, *Settings → Pages → Build and deployment → Source: GitHub Actions*.
2. **Rodar a primeira atualização**: aba *Actions → Atualizar e publicar → Run workflow*. Em poucos minutos a página fica em `https://danielsouza-adv.github.io/rise-consulta/`.
3. **WordPress**: crie (ou edite) a página, adicione um bloco **HTML personalizado** e cole o conteúdo de [`wordpress/bloco-html.html`](wordpress/bloco-html.html).

Opções no `<div>`:

| Atributo | Para quê |
| --- | --- |
| `data-contato` | Destino do botão "Pedir análise do caso". URL recebe `?cnpj=...&origem=consulta`; uma âncora (`#contato`) rola a própria página |
| `data-whatsapp` | Número com DDI e DDD, só dígitos (ex.: `5561999999999`), para mostrar o botão de WhatsApp |
| `data-titulo` | Título do bloco |
| `data-dados` | Pasta dos arquivos de dados, com barra no fim. Sem isso, sai do endereço do script; informe quando um construtor de página reinjetar o script |
| `data-fontes="nao"` | Não carrega a fonte Playfair Display do Google Fonts (os títulos usam a serifada do sistema) |

Se o Google Analytics 4 estiver no site, a consulta registra os eventos `consulta_elegibilidade` (com ou sem sanção, sem o CNPJ) e `clique_contato_consulta`.

## O que a página informa em cada registro

- **Alcance** da sanção, conforme o tipo e a lei aplicada.
- **Linha do tempo**: quanto do prazo já correu e, quando a lei permite, o ponto a partir do qual a reabilitação pode ser pedida.
- **Reabilitação**: prazo mínimo do art. 163 da Lei 14.133 (1 ano do impedimento, 3 da inidoneidade) ou do art. 87, §3º da Lei 8.666 (2 anos da inidoneidade). Quando a sanção termina junto ou antes desse prazo, a página diz que não há ganho.
- **Prazo acima do previsto em lei**: aviso quando a duração registrada supera o máximo legal (suspensão da Lei 8.666: 2 anos; impedimento da Lei 14.133: 3; do pregão: 5; inidoneidade da Lei 14.133: 6). Só aparece quando o fundamento cita uma única lei de licitação.
- **Número do processo**, para distinguir registros iguais de processos diferentes.

As regras ficam na primeira metade de `site/consulta-rise.js` e são cobertas por `tests/test_consulta.js`. Ao mudar uma regra, mude o teste junto.

## Integração com a página que hospeda

- O navegador guarda o `consulta-rise.js` por cerca de 10 minutos. Para forçar a versão nova numa página já publicada, acrescente ou troque o `?v=` no fim do endereço do script.
- Se a consulta exibir "não consegui alcançar a base de dados", o endereço dos dados ficou errado: veja a mensagem `[consulta-rise]` no console do navegador e, se preciso, fixe o caminho com `data-dados`.
- Cores e tamanho podem ser ajustados por CSS na página: `#consulta-rise{--rc-ink:#000;--rc-gold:#c8a96e;--rc-size:19px;--rc-font:inherit}`.
- A cada consulta, a página recebe o evento `consulta-rise:resultado` em `document`, com `detail = {cnpj, empresa, registros, tipos}`. A LP do R.I.S.E. usa isso para preencher o formulário.

## Atualização dos dados

Automática, todo dia às 06:17 (Brasília). Se o download falhar (o Portal fora do ar, por exemplo), a página continua com os dados do dia anterior e o GitHub avisa por e-mail.

## Desenvolvimento

```
python3 -m unittest discover -s tests -v                                     # gerador de dados
node --test tests/test_consulta.js                                           # regras da página
python3 gerar_dados.py --ceis CEIS.zip --cnep CNEP.zip --saida site/dados   # com arquivos locais
python3 -m http.server -d site 8000                                          # testar em http://localhost:8000
```

Texto sugerido para a página do WordPress: [`wordpress/texto-da-pagina.md`](wordpress/texto-da-pagina.md).

As informações têm caráter informativo e não substituem a leitura do ato punitivo nem a análise jurídica do caso.
