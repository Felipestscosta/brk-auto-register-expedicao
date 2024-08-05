"use client";
import { BaseballCap, CircleNotch, FileArrowDown, Hoodie, ListPlus, MicrosoftExcelLogo, TShirt } from "@phosphor-icons/react";
import { SubmitHandler, useForm } from "react-hook-form";
import CurrencyInput from "react-currency-input-field";
import { useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { writeFileXLSX, utils } from "xlsx";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import axios from "axios";
import { z } from "zod";

const schemaFormularioProduto = z.object({
  codigo: z.string().min(1, { message: "Campo vazio!" }),
  titulo: z.string(),
  estoque: z.string().min(1, { message: "Campo vazio!" }),
  preco: z.string().min(1, { message: "Campo vazio!" }),
  imagens: z.any(),
});

type formularioDados = z.infer<typeof schemaFormularioProduto>;

const precos = {
  camisa: 154.9,
  camiseta: 94.9,
  bone: 129.9,
  cortaVento: 229.9,
};

export default function Home() {
  const searchParams = useSearchParams();
  const codigoBling = searchParams?.get("code");

  const [files, setFiles] = useState<any[]>([]);
  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [],
    },
    onDrop: (acceptedFiles) => {
      setFiles(
        acceptedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        )
      );
    },
  });

  const [tituloProduto, setTituloProduto] = useState<string>("");
  const [tipoDeProduto, setTipoDeProduto] = useState("camisa");
  const [idProduto, setIdProduto] = useState<string>("");
  const [tipoCadastro, setTipoCadastro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Autenticação do Bling
  const iniciarOAuth = () => {
    const clientId = `${process.env.NEXT_PUBLIC_BLING_API_CLIENT_ID}`;
    const authUrl = `https://www.bling.com.br/b/Api/v3/oauth/authorize?response_type=code&client_id=${clientId}&state=a223bb05e34e202f5cc198603b351957`;
    window.location.href = authUrl;
  };

  function getToken() {
    axios.get(`/api/bling-token?code=${codigoBling}`).then((res: any) => {
      if (res.error === undefined) {
        const token = res.data.access_token;
        localStorage.setItem("tokenBling", token);
      } else {
        alert("Ops! Houve um problema na geração do Token ⛔");
      }
    });
  }

  useEffect(() => {
    console.log(localStorage.getItem("tokenBling"));

    if (codigoBling === null) iniciarOAuth();
    if (codigoBling !== "") {
      if (localStorage.getItem("tokenBling") === "" || localStorage.getItem("tokenBling") === null) getToken();
    }

    () => files.forEach((file) => URL.revokeObjectURL(file.preview));
  });

  // Captura do Formulário
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<formularioDados>({
    resolver: zodResolver(schemaFormularioProduto),
  });

  const onSubmit: SubmitHandler<formularioDados> = async (data) => {
    setCarregando(true);

    // Processamento das Imagens
    let todasAsImagensBling = [];
    let todasAsImagens = [];

    const qtdFiles = Object.keys(files).length;

    const filesOrdenados = files.toSorted((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    for (let i = 0; i < qtdFiles; i++) {
      const file = filesOrdenados[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "ml_default");

      try {
        const response = await axios.post("https://api.cloudinary.com/v1_1/daruxsllg/image/upload", formData);

        todasAsImagens.push(response.data.secure_url); //Imagens para Planilha

        todasAsImagensBling.push({ link: response.data.secure_url }); //Imagens para o Bling
      } catch (error) {
        console.error("Erro no Upload da Imagem: ", error);
      }
    }

    // Dados da Planilha
    var preco = parseFloat(data.preco.replace("R$", "").replace(".", "").replace(",", "."));
    var estoque = parseInt(data.estoque);

    const primeiraLinhaDaPlanilha = [
      {
        codigo: data.codigo.toLocaleUpperCase(),
        descricao: data.titulo,
        estoque: estoque,
        preco: preco,
        produto_variacao: "Produto",
        tipo_producao: "Terceiros",
        tipo_do_item: "Mercadoria para Revenda",
        codigo_pai: "",
        marca: "",
        url_imagens_externas: todasAsImagens.join("|"), //backlog clodinary
        grupo_de_produtos: (tipoDeProduto === "camisa" && "Camisa Master") || (tipoDeProduto === "camiseta" && "Camiseta Casual"),
      },
    ];

    var variacaoDeProduto: any = [...primeiraLinhaDaPlanilha];

    const dadosBling = {
      nome: data.titulo,
      codigo: data.codigo.toLocaleUpperCase(),
      preco: preco,
      tipo: "P",
      situacao: "A",
      formato: "S",
      descricaoCurta: "Descrição curta",
      unidade: "UN",
      pesoLiquido: 0.25,
      pesoBruto: 0.25,
      volumes: 1,
      itensPorCaixa: 1,
      gtin: "7794051852802",
      gtinEmbalagem: "7794051852802",
      tipoProducao: "P",
      condicao: 0,
      freteGratis: false,
      marca: "",
      descricaoComplementar: "",
      dimensoes: {
        largura: 10,
        altura: 11,
        profundidade: 16,
        unidadeMedida: 1,
      },
      actionEstoque: "T",
      tributacao: {
        origem: 0,
        ncm: "6101.30.00",
        cest: "28.038.00",
        codigoListaServicos: "",
        spedTipoItem: "",
        codigoItem: "",
        valorBaseStRetencao: 0,
        valorStRetencao: 0,
        valorICMSSubstituto: 0,
      },
      midia: {
        imagens: {
          externas: todasAsImagensBling,
        },
      },
    };

    try {
      if (tipoCadastro === "planilha") {
        if (qtdFiles === 0) return alert("Não se esqueça das Imagens! 🖼️");
        console.log(pegaDetalhesProduto(idProduto));
        geraPlanilha(variacaoDeProduto, data.codigo.toUpperCase());
      } else if (tipoCadastro === "bling") {
        //saveProdutos(dadosBling);
      }
    } catch (error) {
      alert(`Opa, tem algum problema rolando... Chama o dev 😒: ${error}`);
      setCarregando(false);
    } finally {
      setCarregando(false);
    }
  };

  // Gera Planinhas
  async function geraPlanilha(dadosDaPlanilha: any, codigoProduto: string) {
    // Planilha do Bling 3
    const rows = Array.from(dadosDaPlanilha).map((row: any) => ({
      ID: "",
      Código: `${row.codigo}_BLACK`, // Dinâmico
      Descrição: row.descricao, // Dinâmico
      Unidade: "UN",
      NCM: "6101.30.00",
      Origem: parseFloat("0"),
      Preço: row.preco, // Dinâmico
      "Valor IPI fixo": parseFloat("0"),
      Observações: "",
      Situação: "Ativo",
      Estoque: row.estoque, // Dinâmico
      "Preço de custo": parseFloat("0"),
      "Cód. no fornecedor": "",
      Fornecedor: "",
      Localização: "",
      "Estoque máximo": parseFloat("0"),
      "Estoque mínimo": parseFloat("0"),
      "Peso líquido (Kg)": parseFloat("0,250"),
      "Peso bruto (Kg)": parseFloat("0,250"),
      "GTIN/EAN": "", // Dinâmico
      "GTIN/EAN da Embalagem": "", // Dinâmico
      "Largura do produto": parseFloat("10"),
      "Altura do Produto": parseFloat("11"),
      "Profundidade do produto": parseFloat("16"),
      "Data Validade": "",
      "Descrição do Produto no Fornecedor": "",
      "Descrição Complementar": "",
      "Itens p/ caixa": parseFloat("1"),
      "Produto Variação": row.produto_variacao, // Dinâmico
      "Tipo Produção": row.tipo_producao, // Dinâmico
      "Classe de enquadramento do IPI": "",
      "Código na Lista de Serviços": "",
      "Tipo do item": row.tipo_do_item, // Dinâmico
      "Grupo de Tags/Tags": "",
      Tributos: parseFloat("0"),
      "Código Pai": row.codigo_pai, // Dinâmico
      "Código Integração": parseFloat("0"),
      "Grupo de produtos": row.grupo_de_produtos, // Dinâmico
      Marca: "",
      CEST: "28.038.00",
      Volumes: parseFloat("1"),
      "Descrição Curta": "",
      "Cross-Docking": "",
      "URL Imagens Externas": row.url_imagens_externas, // Dinâmico
      "Link Externo": "",
      "Meses Garantia no Fornecedor": parseFloat("0"),
      "Clonar dados do pai": "NÂO",
      "Condição do Produto": "NOVO",
      "Frete Grátis": "NÂO",
      "Número FCI": "",
      Vídeo: "",
      Departamento: "",
      "Unidade de Medida": "Centímetro",
      "Preço de Compra": parseFloat("0"),
      "Valor base ICMS ST para retenção": parseFloat("0"),
      "Valor ICMS ST para retenção": parseFloat("0"),
      "Valor ICMS próprio do substituto": parseFloat("0"),
      "Categoria do produto": "",
      "Informações Adicionais": "",
    }));

    const worksheet = utils.json_to_sheet(rows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "");
    writeFileXLSX(workbook, `${codigoProduto}-bling-3.xlsx`, {
      compression: true,
    });

    // Planilha do Bling 1
    const rowsBling1 = Array.from(dadosDaPlanilha).map((row: any) => ({
      ID: "",
      Código: row.codigo, // Dinâmico
      Descrição: row.descricao, // Dinâmico
      Unidade: "UN",
      NCM: "6101.30.00",
      Origem: parseFloat("0"),
      Preço: row.preco, // Dinâmico
      "Valor IPI fixo": parseFloat("0"),
      Observações: "",
      Situação: "Ativo",
      Estoque: parseFloat("0"), // Dinâmico
      "Preço de custo": parseFloat("0"),
      "Cód. no fornecedor": "",
      Fornecedor: "",
      Localização: "",
      "Estoque máximo": parseFloat("0"),
      "Estoque mínimo": parseFloat("0"),
      "Peso líquido (Kg)": parseFloat("0,250"),
      "Peso bruto (Kg)": parseFloat("0,250"),
      "GTIN/EAN": "", // Dinâmico
      "GTIN/EAN da Embalagem": "", // Dinâmico
      "Largura do produto": parseFloat("10"),
      "Altura do Produto": parseFloat("11"),
      "Profundidade do produto": parseFloat("16"),
      "Data Validade": "",
      "Descrição do Produto no Fornecedor": "",
      "Descrição Complementar": "",
      "Itens p/ caixa": parseFloat("1"),
      "Produto Variação": row.produto_variacao, // Dinâmico
      "Tipo Produção": "Própria", // Dinâmico
      "Classe de enquadramento do IPI": "",
      "Código na Lista de Serviços": "",
      "Tipo do item": "Produto Acabado", // Dinâmico
      "Grupo de Tags/Tags": "",
      Tributos: parseFloat("0"),
      "Código Pai": row.codigo_pai, // Dinâmico
      "Código Integração": parseFloat("0"),
      "Grupo de produtos": row.grupo_de_produtos, // Dinâmico
      Marca: "",
      CEST: "28.038.00",
      Volumes: parseFloat("1"),
      "Descrição Curta": "",
      "Cross-Docking": "",
      "URL Imagens Externas": row.url_imagens_externas, // Dinâmico
      "Link Externo": "",
      "Meses Garantia no Fornecedor": parseFloat("0"),
      "Clonar dados do pai": "NÂO",
      "Condição do Produto": "NOVO",
      "Frete Grátis": "NÂO",
      "Número FCI": "",
      Vídeo: "",
      Departamento: "",
      "Unidade de Medida": "Centímetro",
      "Preço de Compra": parseFloat("0"),
      "Valor base ICMS ST para retenção": parseFloat("0"),
      "Valor ICMS ST para retenção": parseFloat("0"),
      "Valor ICMS próprio do substituto": parseFloat("0"),
      "Categoria do produto": "",
      "Informações Adicionais": "",
    }));

    const worksheetBling1 = utils.json_to_sheet(rowsBling1);
    const workbookBling1 = utils.book_new();
    utils.book_append_sheet(workbookBling1, worksheetBling1);
    writeFileXLSX(workbookBling1, `${codigoProduto}-bling-1.xlsx`);
    setCarregando(false);
  }

  // Mostra o Preview das Imagens no Drop Input
  const thumbs = files.map((file) => (
    <div key={file.name}>
      <Image
        className="rounded-lg"
        width={90}
        height={90}
        src={file.preview}
        onLoad={() => {
          URL.revokeObjectURL(file.preview);
        }}
        alt=""
      />
    </div>
  ));

  // Consulta Produto No Bling Utilizando o Código
  const pegaProdutoPorCodigo = (codigo: string) => {
    if (codigo.length > 3) {
      const options = {
        method: "GET",
        url: `/api/bling-produtos?token=${localStorage.getItem("tokenBling")}&codigoProduto=${codigo}`,
      };

      axios
        .request(options)
        .then(function (response) {
          console.log(response.data[0]);
          setTituloProduto(response.data[0].nome);
          setIdProduto(response.data[0].id);
        })
        .catch(function (error) {
          console.error(error);
        });
    }
  };

  // Consulta Detalhes de Um Produto No Bling
  const pegaDetalhesProduto = (idProduto: string) => {
    const options = {
      method: "GET",
      url: `/api/bling-produtos?token=${localStorage.getItem("tokenBling")}&idProduto=${idProduto}`,
    };

    axios
      .request(options)
      .then(function (response) {
        console.log("EAN: ", response.data.data.gtin);
        console.log("EAN Embalagem", response.data.data.gtinEmbalagem);
      })
      .catch(function (error) {
        console.error(error);
      });
  };

  return (
    <>
      <div className="relative flex flex-col min-h-screen h-full w-full items-center justify-center gap-4 py-10 overflow-y-clip">
        {/* Imagens de Bakcground Dinâmicas */}
        <Image
          src={`/camisa.png`}
          className={`absolute ease-in-out -left-60 -bottom-96 z-0 ${tipoDeProduto === "camisa" ? "translate-x-0 translate-y-0 placeholder-opacity-75" : "opacity-0 translate-x-10 translate-y-10"}`}
          width={900}
          height={900}
          alt=""
          priority
        />

        <Image
          src={`/camiseta.png`}
          className={`absolute ease-in-out -left-60 -bottom-80 z-0 ${tipoDeProduto === "camiseta" ? "translate-x-0 translate-y-0 placeholder-opacity-75" : "opacity-0 translate-x-10 translate-y-10"}`}
          width={900}
          height={900}
          alt=""
        />

        <Image
          src={`/bone.png`}
          className={`absolute ease-in-out -left-60 -bottom-80 z-0 ${tipoDeProduto === "bone" ? "translate-x-0 translate-y-0 placeholder-opacity-75" : "opacity-0 translate-x-10 translate-y-10"}`}
          width={900}
          height={900}
          alt=""
        />
        {/* Fim da Seção das Imagens Dinâmicas */}

        {/* Escolha do Tipo de Produto */}
        <div className="absolute right-0 flex flex-col justify-center align-center divide-y z-10">
          <button
            onClick={() => setTipoDeProduto("camisa")}
            type="button"
            className={`flex flex-col gap-2 items-center justify-center py-6 px-2 rounded-tl-lg  ${
              tipoDeProduto === "camisa" ? "bg-slate-200 text-zinc-950" : "text-zinc-200 hover:bg-slate-200 hover:text-slate-950"
            }`}
          >
            <Hoodie size={32} />
            Camisa
          </button>
          <button
            onClick={() => setTipoDeProduto("camiseta")}
            type="button"
            className={`flex flex-col gap-2 items-center justify-center py-6 px-2 ${
              tipoDeProduto === "camiseta" ? "bg-slate-200 text-zinc-950" : "text-zinc-200 hover:bg-slate-200 hover:text-slate-950"
            }`}
          >
            <TShirt size={32} />
            Camiseta
          </button>
          <button
            onClick={() => setTipoDeProduto("bone")}
            type="button"
            className={`flex flex-col gap-2 items-center justify-center py-6 px-2 ${tipoDeProduto === "bone" ? "bg-slate-200 text-zinc-950" : "text-zinc-200 hover:bg-slate-200 hover:text-slate-950"}`}
          >
            <BaseballCap size={32} />
            Boné
          </button>
          <button
            onClick={() => setTipoDeProduto("cortavento")}
            type="button"
            className={`flex flex-col gap-2 items-center justify-center py-6 px-2 rounded-bl-lg ${
              tipoDeProduto === "cortavento" ? "bg-slate-200 text-zinc-950" : "text-zinc-200 hover:bg-slate-200 hover:text-slate-950"
            } opacity-15 pointer-events-none`}
          >
            <Hoodie size={32} />
            Corta-vento
          </button>
        </div>

        {/* Formulários */}
        <div className="flex z-10">
          <form className="flex flex-col justify-center items-center gap-10" onSubmit={handleSubmit(onSubmit)}>
            {/* Seção de Camisa */}
            {tipoDeProduto === "camisa" && (
              <>
                <section className="container">
                  <label
                    htmlFor="imagens"
                    {...getRootProps({
                      className: "dropzone flex bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 border-dashed w-full justify-center items-center cursor-pointer mb-10 mt-4 p-8 rounded-lg",
                    })}
                  >
                    <input className="cursor-pointer text-zinc-200" type="file" id="imagens" multiple {...register("imagens")} {...getInputProps()} />

                    <div className="flex flex-col gap-1 text-slate-100">
                      <h4>
                        {files.length === 0 ? (
                          <div className="flex flex-col gap-4 justify-center items-center text-slate-100/45">
                            <FileArrowDown size={32} />
                            <p>Selecione as Imagens ou Solte Aqui</p>
                          </div>
                        ) : (
                          "Imagens"
                        )}
                      </h4>
                      <ul className="flex text-slate-100/45 gap-4">{thumbs}</ul>
                    </div>
                  </label>
                </section>

                <div className="flex gap-10 mb-4 w-full">
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="codigo">
                    Código
                    <input
                      className="max-w-32 bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5 uppercase"
                      id="codigo"
                      type="text"
                      placeholder="Ex: C0..."
                      {...register("codigo")}
                      onKeyUp={(e: any) => pegaProdutoPorCodigo(e.target.value)}
                    />
                    {errors.codigo?.message ? <span className="text-red-300">{errors.codigo?.message}</span> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-zinc-200 w-full" htmlFor="titulo">
                    Titulo
                    <input
                      className="w-full bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="titulo"
                      type="text"
                      placeholder="Camisa Brk Agro Produtor de Café com Prot..."
                      {...register("titulo")}
                      defaultValue={`${tituloProduto ? tituloProduto : ""}`}
                    />
                    {errors.titulo?.message ? <span className="text-red-300">{errors.titulo?.message}</span> : null}
                  </label>
                </div>

                <div className="flex mb-16 gap-10">
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="estoque">
                    Estoque
                    <input
                      className="max-w-32 bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="estoque"
                      type="text"
                      {...register("estoque")}
                      placeholder="1000"
                    />
                    {errors.estoque?.message ? <span className="text-red-300">{errors.estoque?.message}</span> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="preco">
                    Preço
                    <CurrencyInput
                      className="max-w-32 bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="preco"
                      placeholder="R$154,90"
                      intlConfig={{ locale: "pt-BR", currency: "BRL" }}
                      {...register("preco")}
                    />
                    {errors.preco?.message ? <span className="text-red-300">{errors.preco?.message}</span> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="titulo">
                    GTIN / EAN
                    <input
                      className="bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="titulo"
                      type="text"
                      placeholder="Nº do EAN ou GTIN"
                      {...register("titulo")}
                      defaultValue={`${tituloProduto ? tituloProduto : ""}`}
                    />
                    {errors.titulo?.message ? <span className="text-red-300">{errors.titulo?.message}</span> : null}
                  </label>
                </div>
              </>
            )}

            {tipoDeProduto === "camiseta" && (
              <>
                <section className="container">
                  <label
                    htmlFor="imagens"
                    {...getRootProps({
                      className: "dropzone flex bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 border-dashed w-full justify-center items-center cursor-pointer mb-10 mt-4 p-8 rounded-lg",
                    })}
                  >
                    <input className="cursor-pointer text-zinc-200" type="file" id="imagens" multiple {...register("imagens")} {...getInputProps()} />

                    <div className="flex flex-col gap-1 text-slate-100">
                      <h4>
                        {files.length === 0 ? (
                          <div className="flex flex-col gap-4 justify-center items-center text-slate-100/45">
                            <FileArrowDown size={32} />
                            <p>Selecione as Imagens ou Solte Aqui</p>
                          </div>
                        ) : (
                          "Imagens"
                        )}
                      </h4>
                      <ul className="flex text-slate-100/45 gap-4">{thumbs}</ul>
                    </div>
                  </label>
                </section>

                <div className="flex gap-10 mb-4 w-full">
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="codigo">
                    Código
                    <input
                      className="max-w-32 bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5 uppercase"
                      id="codigo"
                      type="text"
                      placeholder="Ex: CASUAL / APC0..."
                      {...register("codigo")}
                      onKeyUp={(e: any) => pegaProdutoPorCodigo(e.target.value)}
                    />
                    {errors.codigo?.message ? <span className="text-red-300">{errors.codigo?.message}</span> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-zinc-200 w-full" htmlFor="titulo">
                    Titulo
                    <input
                      className="w-full bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="titulo"
                      type="text"
                      placeholder="Camiseta Brk Agro Agronomia com Algodão Egíp..."
                      {...register("titulo")}
                      defaultValue={`${tituloProduto ? tituloProduto : ""}`}
                    />
                    {errors.titulo?.message ? <span className="text-red-300">{errors.titulo?.message}</span> : null}
                  </label>
                </div>

                <div className="flex mb-16 gap-10">
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="estoque">
                    Estoque
                    <input
                      className="max-w-32 bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="estoque"
                      type="text"
                      {...register("estoque")}
                      placeholder="1000"
                    />
                    {errors.estoque?.message ? <span className="text-red-300">{errors.estoque?.message}</span> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="preco">
                    Preço
                    <CurrencyInput
                      className="max-w-32 bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="preco"
                      placeholder="Cas. R$94,90 / APC0 R$129,90"
                      intlConfig={{ locale: "pt-BR", currency: "BRL" }}
                      {...register("preco")}
                    />
                    {errors.preco?.message ? <span className="text-red-300">{errors.preco?.message}</span> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="titulo">
                    GTIN / EAN
                    <input
                      className="bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="titulo"
                      type="text"
                      placeholder="Nº do EAN ou GTIN"
                      {...register("titulo")}
                      defaultValue={`${tituloProduto ? tituloProduto : ""}`}
                    />
                    {errors.titulo?.message ? <span className="text-red-300">{errors.titulo?.message}</span> : null}
                  </label>
                </div>
              </>
            )}

            {tipoDeProduto === "bone" && (
              <>
                <section className="container">
                  <label
                    htmlFor="imagens"
                    {...getRootProps({
                      className: "dropzone flex bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 border-dashed w-full justify-center items-center cursor-pointer mb-10 mt-4 p-8 rounded-lg",
                    })}
                  >
                    <input className="cursor-pointer text-zinc-200" type="file" id="imagens" multiple {...register("imagens")} {...getInputProps()} />

                    <div className="flex flex-col gap-1 text-slate-100">
                      <h4>
                        {files.length === 0 ? (
                          <div className="flex flex-col gap-4 justify-center items-center text-slate-100/45">
                            <FileArrowDown size={32} />
                            <p>Selecione as Imagens ou Solte Aqui</p>
                          </div>
                        ) : (
                          "Imagens"
                        )}
                      </h4>
                      <ul className="flex text-slate-100/45 gap-4">{thumbs}</ul>
                    </div>
                  </label>
                </section>

                <div className="flex gap-10 mb-4 w-full">
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="codigo">
                    Código
                    <input
                      className="max-w-32 bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5 uppercase"
                      id="codigo"
                      type="text"
                      placeholder="Ex: B0 / BA0..."
                      {...register("codigo")}
                      onKeyUp={(e: any) => pegaProdutoPorCodigo(e.target.value)}
                    />
                    {errors.codigo?.message ? <span className="text-red-300">{errors.codigo?.message}</span> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-zinc-200 w-full" htmlFor="titulo">
                    Titulo
                    <input
                      className="w-full bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="titulo"
                      type="text"
                      placeholder="Boné Trucker Brk Agro Camo..."
                      {...register("titulo")}
                      defaultValue={`${tituloProduto ? tituloProduto : ""}`}
                    />
                    {errors.titulo?.message ? <span className="text-red-300">{errors.titulo?.message}</span> : null}
                  </label>
                </div>

                <div className="flex mb-16 gap-10">
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="estoque">
                    Estoque
                    <input
                      className="max-w-32 bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="estoque"
                      type="text"
                      {...register("estoque")}
                      placeholder="1000"
                    />
                    {errors.estoque?.message ? <span className="text-red-300">{errors.estoque?.message}</span> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="preco">
                    Preço
                    <CurrencyInput
                      className="max-w-32 bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="preco"
                      placeholder="R$129,90"
                      intlConfig={{ locale: "pt-BR", currency: "BRL" }}
                      {...register("preco")}
                    />
                    {errors.preco?.message ? <span className="text-red-300">{errors.preco?.message}</span> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-zinc-200" htmlFor="titulo">
                    GTIN / EAN
                    <input
                      className="bg-transparent text-zinc-400 placeholder:text-zinc-400/25 placeholder:text-sm border-b border-b-zinc-700 py-1.5"
                      id="titulo"
                      type="text"
                      placeholder="Nº do EAN ou GTIN"
                      {...register("titulo")}
                      defaultValue={`${tituloProduto ? tituloProduto : ""}`}
                    />
                    {errors.titulo?.message ? <span className="text-red-300">{errors.titulo?.message}</span> : null}
                  </label>
                </div>
              </>
            )}

            {tipoDeProduto === "cortavento" && (
              <>
                <input type="file" name="" id="" multiple />

                <div className="flex gap-4">
                  <label className="flex flex-col gap-2" htmlFor="codigo">
                    Código
                    <input
                      className="max-w-32 bg-transparent text-zinc-200 placeholder:text-sm border-b border-r-0 border-l-0 border-t-0 py-1.5 uppercase"
                      id="codigo"
                      type="text"
                      placeholder="Ex: CV0..."
                    />
                  </label>
                  <label className="flex flex-col gap-2" htmlFor="titulo">
                    Titulo
                    <input
                      className="min-w-96 bg-transparent text-zinc-200 placeholder:text-sm border-b border-r-0 border-l-0 border-t-0 py-1.5"
                      id="titulo"
                      type="text"
                      placeholder="Ex: Jaqueta Corta Vento Brk..."
                    />
                  </label>
                  <label className="flex flex-col gap-2" htmlFor="estoque">
                    Estoque
                    <input
                      className="max-w-32 bg-transparent text-zinc-200 placeholder:text-sm border-b border-r-0 border-l-0 border-t-0 py-1.5"
                      id="estoque"
                      type="text"
                      placeholder="Ex: C0..."
                      defaultValue={1000}
                    />
                  </label>
                  <label className="flex flex-col gap-2" htmlFor="preco">
                    Preço ( R$ )
                    <input
                      className="max-w-32 bg-transparent text-zinc-200 placeholder:text-sm border-b border-r-0 border-l-0 border-t-0 py-1.5"
                      id="preco"
                      type="text"
                      defaultValue={precos.cortaVento}
                    />
                  </label>
                </div>
              </>
            )}

            {tipoDeProduto !== "" && (
              <div className="flex container items-center justify-center mt-10 pt-10 py-2 px-10 border-t border-zinc-800 gap-8">
                <button
                  onClick={() => {
                    setTipoCadastro("planilha");
                  }}
                  type="submit"
                  className={`py-2 px-10 border border-transparent hover:border-zinc-400 rounded-lg text-zinc-200 ${carregando && "pointer-events-none cursor-not-allowed opacity-5"}`}
                >
                  {carregando ? (
                    <span className="flex justify-center items-center">
                      <CircleNotch size={20} className="animate-spin mr-4" />
                      Processando...
                    </span>
                  ) : (
                    <span className="flex justify-center items-center gap-2">
                      <MicrosoftExcelLogo size={32} /> Gerar Planilha
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setTipoCadastro("bling");
                  }}
                  type="submit"
                  className={`hidden py-2 px-10 border border-transparent hover:border-zinc-400 rounded-lg text-zinc-200 ${carregando && "pointer-events-none cursor-not-allowed opacity-5"}`}
                >
                  {carregando ? (
                    <span className="flex justify-center items-center">
                      <CircleNotch size={20} className="animate-spin mr-4" />
                      Processando...
                    </span>
                  ) : (
                    <span className="flex justify-center items-center gap-2">
                      <ListPlus size={32} /> Cadastrar
                    </span>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
