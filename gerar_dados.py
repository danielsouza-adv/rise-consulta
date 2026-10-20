#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Consulta de elegibilidade R.I.S.E. — gerador de dados

Baixa as bases oficiais do CEIS e do CNEP (Portal da Transparência, dados abertos)
e gera arquivos JSON pequenos, separados pelos 2 primeiros dígitos do CNPJ, para a
página de consulta. Só empresas (CNPJ): registros de pessoa física são ignorados.

Uso:
    python3 gerar_dados.py --saida site/dados                 # baixa e gera
    python3 gerar_dados.py --ceis CEIS.zip --cnep CNEP.zip --saida site/dados

Requisitos: Python 3.8+, sem bibliotecas externas.
"""

import argparse
import csv
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request
import zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

VERSAO = "1.0.0"
URLS = (
    "https://portaldatransparencia.gov.br/download-de-dados/{base}/{data}",
    "https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/{base}/{data}_{BASE}.zip",
)
AGENTE = "Mozilla/5.0 (compatible; rise-consulta/%s; +https://danielssouza.com/metodo-rise/)" % VERSAO


def chave(s):
    return re.sub(r"[^A-Z0-9]", "", unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().upper())


def iso(s):
    s = str(s or "").strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s[:10], fmt).date().isoformat()
        except ValueError:
            pass
    return None


def ler_zip_ou_csv(caminho):
    if caminho.lower().endswith(".zip"):
        with zipfile.ZipFile(caminho) as z:
            nome = next(n for n in z.namelist() if n.lower().endswith(".csv"))
            bruto = z.read(nome)
    else:
        with open(caminho, "rb") as f:
            bruto = f.read()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            texto = bruto.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    return list(csv.DictReader(io.StringIO(texto), delimiter=";"))


def baixar(base, pasta, hoje):
    os.makedirs(pasta, exist_ok=True)
    for atraso in range(0, 10):
        dia = (hoje - timedelta(days=atraso)).strftime("%Y%m%d")
        for modelo in URLS:
            url = modelo.format(base=base, data=dia, BASE=base.upper())
            try:
                req = urllib.request.Request(url, headers={"User-Agent": AGENTE})
                with urllib.request.urlopen(req, timeout=180) as r:
                    dados = r.read()
                if not dados.startswith(b"PK"):
                    continue
                destino = os.path.join(pasta, "%s_%s.zip" % (dia, base.upper()))
                with open(destino, "wb") as f:
                    f.write(dados)
                return destino, dia
            except Exception:
                continue
    raise RuntimeError("Não foi possível baixar o %s dos últimos 10 dias." % base.upper())


CAMPOS = {
    "doc": ("CPFOUCNPJDOSANCIONADO",), "tipo_pessoa": ("TIPODEPESSOA",),
    "nome": ("RAZAOSOCIALCADASTRORECEITA", "NOMEDOSANCIONADO"),
    "categoria": ("CATEGORIADASANCAO",), "inicio": ("DATAINICIOSANCAO",), "fim": ("DATAFINALSANCAO",),
    "publicacao": ("DATAPUBLICACAO",), "orgao": ("ORGAOSANCIONADOR",), "uf_orgao": ("UFORGAOSANCIONADOR",),
    "esfera": ("ESFERAORGAOSANCIONADOR",), "fundamentacao": ("FUNDAMENTACAOLEGAL",),
    "abrangencia": ("ABRAGENCIADEFINIDAEMDECISAOJUDICIAL", "ABRANGENCIADEFINIDAEMDECISAOJUDICIAL"),
    "processo": ("NUMERODOPROCESSO",), "multa": ("VALORDAMULTA",),
}


def normalizar(row):
    por = {chave(k): (v or "").strip() for k, v in row.items() if k}
    return {campo: next((por[n] for n in nomes if por.get(n)), "") for campo, nomes in CAMPOS.items()}


def gerar(registros_por_base, saida, hoje, origem):
    """registros_por_base: {"CEIS": [rows], "CNEP": [rows]} -> grava XX.json e meta.json."""
    por_prefixo = defaultdict(dict)
    total_sancoes = 0
    for base, rows in registros_por_base.items():
        for row in rows:
            r = normalizar(row)
            doc = re.sub(r"\D", "", r["doc"])
            if r["tipo_pessoa"].upper().startswith("F") or len(doc) != 14:
                continue                                   # pessoa física nunca entra na consulta
            fim = iso(r["fim"])
            if fim and fim < hoje.isoformat():
                continue
            empresa = por_prefixo[doc[:2]].setdefault(doc, {"n": r["nome"], "s": []})
            s = {"b": base, "c": r["categoria"], "o": r["orgao"], "u": r["uf_orgao"], "e": r["esfera"],
                 "i": iso(r["inicio"]), "f": fim, "p": iso(r["publicacao"]), "l": r["fundamentacao"],
                 "a": r["abrangencia"]}
            if r["multa"]:
                s["m"] = r["multa"]
            if s not in empresa["s"]:
                empresa["s"].append(s)
                total_sancoes += 1
    os.makedirs(saida, exist_ok=True)
    for arq in os.listdir(saida):
        if re.fullmatch(r"\d{2}\.json", arq):
            os.remove(os.path.join(saida, arq))
    for prefixo in ("%02d" % i for i in range(100)):
        with open(os.path.join(saida, prefixo + ".json"), "w", encoding="utf-8") as f:
            json.dump(por_prefixo.get(prefixo, {}), f, ensure_ascii=False, separators=(",", ":"))
    meta = {"atualizado_em": datetime.now(timezone.utc).isoformat(timespec="minutes"),
            "data_referencia": hoje.isoformat(), "origem": origem,
            "empresas": sum(len(v) for v in por_prefixo.values()), "sancoes": total_sancoes, "versao": VERSAO}
    with open(os.path.join(saida, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    return meta


def main(argv=None):
    p = argparse.ArgumentParser(description="Gera os dados da Consulta de elegibilidade R.I.S.E.")
    p.add_argument("--ceis")
    p.add_argument("--cnep")
    p.add_argument("--saida", default=os.path.join("site", "dados"))
    p.add_argument("--hoje", help="AAAA-MM-DD (padrão: hoje)")
    a = p.parse_args(argv)
    hoje = datetime.strptime(a.hoje, "%Y-%m-%d").date() if a.hoje else date.today()
    arquivos, origem = {}, {}
    for base in ("ceis", "cnep"):
        arq = getattr(a, base)
        if arq:
            arquivos[base.upper()], origem[base.upper()] = arq, os.path.basename(arq)
        else:
            arq, dia = baixar(base, "bases", hoje)
            arquivos[base.upper()], origem[base.upper()] = arq, "Portal da Transparência, arquivo de %s" % dia
            print("%s baixado (%s)" % (base.upper(), dia))
    meta = gerar({b: ler_zip_ou_csv(c) for b, c in arquivos.items()}, a.saida, hoje, origem)
    print("Gerado: %d empresas, %d sanções em %s" % (meta["empresas"], meta["sancoes"], a.saida))
    return 0


if __name__ == "__main__":
    sys.exit(main())
