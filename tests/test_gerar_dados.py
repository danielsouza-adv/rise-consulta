# -*- coding: utf-8 -*-
import csv, io, json, os, shutil, sys, tempfile, unittest, zipfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import gerar_dados as g  # noqa: E402

CAB = ["CADASTRO", "TIPO DE PESSOA", "CPF OU CNPJ DO SANCIONADO", "NOME DO SANCIONADO",
       "RAZÃO SOCIAL - CADASTRO RECEITA", "CATEGORIA DA SANÇÃO", "DATA INÍCIO SANÇÃO", "DATA FINAL SANÇÃO",
       "DATA PUBLICAÇÃO", "ÓRGÃO SANCIONADOR", "UF ÓRGÃO SANCIONADOR", "ESFERA ÓRGÃO SANCIONADOR",
       "FUNDAMENTAÇÃO LEGAL", "VALOR DA MULTA"]


class TestGerar(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.d, ignore_errors=True)

    def zipar(self, nome, linhas):
        buf = io.StringIO()
        w = csv.writer(buf, delimiter=";", quoting=csv.QUOTE_ALL)
        w.writerow(CAB)
        w.writerows(linhas)
        p = os.path.join(self.d, nome)
        with zipfile.ZipFile(p, "w") as z:
            z.writestr("x.csv", buf.getvalue().encode("cp1252"))
        return p

    def test_gera_por_prefixo_sem_pessoa_fisica_nem_vencidas(self):
        ceis = self.zipar("c.zip", [
            ["CEIS", "J", "11.222.333/0001-81", "ALFA LTDA", "ALFA LTDA", "Suspensão", "01/01/2026", "01/01/2027",
             "02/01/2026", "Prefeitura", "SP", "MUNICIPAL", "Lei 8.666", ""],
            ["CEIS", "J", "11.222.333/0001-81", "ALFA LTDA", "ALFA LTDA", "Suspensão", "01/01/2023", "01/01/2024",
             "02/01/2023", "Prefeitura", "SP", "MUNICIPAL", "Lei 8.666", ""],          # vencida
            ["CEIS", "F", "123.456.789-09", "FULANO", "", "Impedimento", "01/01/2026", "", "", "X", "SP", "", "", ""],
        ])
        cnep = self.zipar("n.zip", [["CNEP", "J", "45111333000126", "GAMA LTDA", "GAMA LTDA", "Multa", "01/01/2026",
                                    "", "05/01/2026", "CGU", "DF", "FEDERAL", "Lei 12.846", "150000,00"]])
        saida = os.path.join(self.d, "dados")
        g.main(["--ceis", ceis, "--cnep", cnep, "--saida", saida, "--hoje", "2026-10-20"])
        arquivos = sorted(os.listdir(saida))
        self.assertEqual(len(arquivos), 101)                     # 00..99 + meta.json
        d11 = json.load(open(os.path.join(saida, "11.json"), encoding="utf-8"))
        self.assertEqual(len(d11["11222333000181"]["s"]), 1)       # só a vigente
        d45 = json.load(open(os.path.join(saida, "45.json"), encoding="utf-8"))
        self.assertEqual(d45["45111333000126"]["s"][0]["m"], "150000,00")
        tudo = "".join(open(os.path.join(saida, a), encoding="utf-8").read() for a in arquivos)
        self.assertNotIn("12345678909", tudo)
        self.assertNotIn("FULANO", tudo)
        meta = json.load(open(os.path.join(saida, "meta.json"), encoding="utf-8"))
        self.assertEqual((meta["empresas"], meta["sancoes"]), (2, 2))


if __name__ == "__main__":
    unittest.main()
