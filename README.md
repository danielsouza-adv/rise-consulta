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
| `data-contato` | Link do botão "Falar com um advogado" (recebe `?cnpj=...&origem=consulta`) |
| `data-whatsapp` | Número com DDI e DDD, só dígitos (ex.: `5561999999999`), para mostrar o botão de WhatsApp |
| `data-titulo` | Título do bloco |

Se o Google Analytics 4 estiver no site, a consulta registra os eventos `consulta_elegibilidade` (com ou sem sanção, sem o CNPJ) e `clique_contato_consulta`.

## Atualização dos dados

Automática, todo dia às 06:17 (Brasília). Se o download falhar (o Portal fora do ar, por exemplo), a página continua com os dados do dia anterior e o GitHub avisa por e-mail.

## Desenvolvimento

```
python3 -m unittest discover -s tests -v
python3 gerar_dados.py --ceis CEIS.zip --cnep CNEP.zip --saida site/dados   # com arquivos locais
python3 -m http.server -d site 8000                                          # testar em http://localhost:8000
```

Texto sugerido para a página do WordPress: [`wordpress/texto-da-pagina.md`](wordpress/texto-da-pagina.md).

As informações têm caráter informativo e não substituem a leitura do ato punitivo nem a análise jurídica do caso.
