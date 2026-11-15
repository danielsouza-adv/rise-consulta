# Resposta automática com o Contact Form 7

Os dois formulários da página (a captura dentro da consulta e o pedido de análise no bloco da
oferta) podem enviar para o Contact Form 7 em vez do Web3Forms. A vantagem é a **resposta
automática**: quem preenche recebe na hora um e-mail seu, saindo do seu domínio, sem mensalidade.

Os formulários do Contact Form 7 criados aqui **nunca aparecem no site**. Eles existem só para
receber os dados e disparar os dois e-mails. A tela continua sendo a dos nossos blocos.

---

## 1. Formulário da consulta

No painel: **Contato → Adicionar novo**. Título: `Consulta CEIS-CNEP — resumo por e-mail`.

### Aba "Formulário"

Apague o conteúdo padrão e cole exatamente isto:

```
[text* nome]
[email* email]
[text whatsapp]
[text cnpj]
[text empresa]
[text resultado]
[text avisar_em]
[text motivo_aviso]
[text aceita_conteudo]
```

### Aba "E-mail" — primeira mensagem (chega para você)

- **Para:** um endereço **diferente** do que está em "De". Se os dois forem `contato@danielssouza.com`,
  o servidor da hospedagem costuma descartar a mensagem em silêncio, porque ela sai dele e volta
  para a mesma caixa sem autenticação. Use o seu Gmail aqui, ou `contato@danielssouza.com` **depois**
  de configurar o SMTP (seção 5).
- **De:** `[_site_title] <contato@danielssouza.com>` — tem de ser um endereço **do seu domínio**
- **Assunto:** `Consulta CEIS/CNEP — [empresa]`
- **Responder para:** `[email]`
- **Corpo:**

```
Nome: [nome]
E-mail: [email]
WhatsApp: [whatsapp]

CNPJ: [cnpj]
Empresa: [empresa]
Resultado: [resultado]

Avisar em: [avisar_em]  ([motivo_aviso])
Aceita conteúdos: [aceita_conteudo]
```

### Aba "E-mail" — segunda mensagem (a resposta automática)

Marque **"E-mail (2)"** e preencha:

- **Para:** `[email]`
- **De:** `Daniel de Souza <contato@danielssouza.com>`
- **Assunto:** `Consulta CEIS e CNEP — [empresa]`
- **Responder para:** o seu e-mail
- **Corpo:**

```
Olá, [nome].

Recebi o seu pedido com o resultado da consulta ao CEIS e ao CNEP:

CNPJ: [cnpj]
Empresa: [empresa]
Situação: [resultado]
Data a acompanhar: [avisar_em] ([motivo_aviso])

Em até 24 horas úteis eu envio o resumo organizado, com o alcance de cada sanção e as datas que
importam. Se quiser adiantar, responda este e-mail com o ato punitivo em anexo — é o primeiro
documento que vamos precisar.

Qualquer dúvida, é só responder aqui ou chamar no WhatsApp (61) 99878-0564.

Dr. Daniel de Souza
OAB/DF 71.124 · D'Souza Advocacia Empresarial
danielssouza.com
```

---

## 2. Formulário do pedido de análise

Mesmo caminho. Título: `Parecer de Elegibilidade — pedido de análise`.

### Aba "Formulário"

```
[text* nome]
[text* empresa]
[text cnpj]
[email* email]
[tel* whatsapp]
[text* situacao]
[text origem]
[text resultado_consulta]
```

### Primeira mensagem (para você)

- **Assunto:** `Pedido de análise — [empresa]`
- **Responder para:** `[email]`
- **Corpo:**

```
Nome: [nome]
Empresa: [empresa]
CNPJ: [cnpj]
E-mail: [email]
WhatsApp: [whatsapp]
Situação: [situacao]

Origem: [origem]
Consulta na página: [resultado_consulta]
```

### Segunda mensagem (resposta automática)

- **Para:** `[email]`
- **Assunto:** `Recebi o seu pedido de análise — [empresa]`
- **Corpo:**

```
Olá, [nome].

Recebi o seu pedido de análise para a [empresa]. Retorno em até 24 horas úteis, pessoalmente.

Para adiantar, separe estes documentos:

- o ato punitivo (ou o número do processo e o órgão que aplicou a sanção);
- o contrato social com a última alteração;
- comprovantes de pagamento de multa ou de reparação de dano, se houver.

A publicação no diário oficial e a cópia do processo administrativo nós buscamos, quando for
possível. O que não chegar a tempo fica marcado como "a confirmar" no parecer.

Se preferir conversar antes, chame no WhatsApp (61) 99878-0564.

Dr. Daniel de Souza
OAB/DF 71.124 · D'Souza Advocacia Empresarial
danielssouza.com
```

---

## 3. Ligar os blocos aos formulários

Os blocos deste repositório já estão ligados aos dois formulários:

| Formulário | Número |
| --- | --- |
| Consulta CEIS-CNEP — resumo por e-mail | 1830 |
| Parecer de Elegibilidade — pedido de análise | 1831 |

O número é o do **post**, visível na barra de endereços ao editar o formulário (`post=1830`). O
identificador em letras e números que aparece no shortcode não serve aqui: a API REST só aceita o
número. Se um dia os formulários forem recriados:

**No bloco da consulta** (`bloco-html.html`), troque o valor de `data-captura` pela URL:

```
data-captura="https://danielssouza.com/wp-json/contact-form-7/v1/contact-forms/1830/feedback"
```

**No bloco da oferta** (`bloco-oferta.html`), troque a linha `var DESTINO = …` por:

```js
var DESTINO = "https://danielssouza.com/wp-json/contact-form-7/v1/contact-forms/1831/feedback";
```

Para voltar ao Web3Forms, basta repor a chave no lugar da URL. Os dois blocos aceitam as duas
formas e se ajustam sozinhos.

---

## 4. O aviso "configuração de e-mail insegura"

O Contact Form 7 marca os dois formulários com `has config errors` porque o campo "Para" do
Mail (2) recebe `[email]`, um endereço digitado por quem preenche. É o que queremos — sem isso não
há resposta automática —, mas é também o que permite a um spammer usar o seu domínio para disparar
e-mail a terceiros. O formulário funciona normalmente; o risco é de reputação do domínio.

**Não ative o Turnstile nem o reCAPTCHA pelo painel do Contact Form 7.** Os dois esperam que o
formulário do CF7 seja renderizado na página, e o nosso não é: o CF7 passaria a exigir um token que
os nossos blocos não enviam, e todo envio pararia. A proteção precisa ser adicionada ao nosso código
e ao formulário ao mesmo tempo — fica para antes de ligar tráfego pago, que é o que torna o endpoint
descobrível.

## 5. Antes de confiar: o envio de e-mail do WordPress

Por padrão o WordPress envia e-mail pela função do PHP, que não autentica remetente. O resultado
costuma ser e-mail na caixa de spam, ou perdido sem aviso. **Instale um plugin de SMTP** (o
FluentSMTP e o WP Mail SMTP são gratuitos) e configure com a conta de e-mail do seu domínio, na
Hostinger. Sem isso, a resposta automática pode simplesmente não chegar.

Teste assim: preencha a consulta com um e-mail seu de outro provedor (Gmail, por exemplo) e
confira se a resposta automática chega, e se não cai em spam.

**Se a resposta automática chegar e o aviso ao escritório não**, o formulário está certo: o
Contact Form 7 só envia a segunda mensagem depois de a primeira ser aceita. A mensagem foi
entregue ao servidor e perdida depois dele. Verifique, nesta ordem: a pasta de spam da caixa de
destino; o endereço em **Configurações → Geral → E-mail de administração**, que é o que
`[_site_admin_email]` usa; e se remetente e destinatário são a mesma caixa. O SMTP resolve os
três.

## 6. Se o formulário da LP também for usar isto

A LP fica em rise.dssouza.com, domínio diferente do site. O WordPress costuma aceitar pedidos de
outros domínios, mas isso precisa ser testado: se o envio na LP parar de funcionar depois da
troca, é esse o motivo, e a solução é manter a LP no Web3Forms ou liberar a origem no servidor.
