import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { token, codigoProduto, idProduto } = req.query;
  const tipoMetodo = req.method;

  if(tipoMetodo === 'GET'){

    if(idProduto){
      const options = {
        method: "GET",
        url: `https://www.bling.com.br/Api/v3/produtos/${idProduto}`,
        headers: {
          client_id: `${process.env.NEXT_PUBLIC_BLING_API_CLIENT_ID}`,
          client_secret: `${process.env.NEXT_PUBLIC_BLING_API_CLIENT_SECRET}`,
          Authorization: `Bearer ${token}`,
        },
      };
  
      axios
        .request(options)
        .then(function (response) {
          console.log(response.data);
          res.status(200).json(response.data)
        })
        .catch(function (error) {
          console.error(error);
        });
    }

    if(codigoProduto){
      const options = {
        method: "GET",
        url: "https://www.bling.com.br/Api/v3/produtos",
        params: { codigo: `${codigoProduto}` },
        headers: {
          client_id: `${process.env.NEXT_PUBLIC_BLING_API_CLIENT_ID}`,
          client_secret: `${process.env.NEXT_PUBLIC_BLING_API_CLIENT_SECRET}`,
          Authorization: `Bearer ${token}`,
        },
      };
  
      axios
        .request(options)
        .then(function (response) {
          console.log(response.data);
          res.status(200).json(response.data)
        })
        .catch(function (error) {
          console.error(error);
        });
    }
  }
  
  // Cria novo Produto
  if(tipoMetodo === 'POST'){
    const dataNovoProduto = req.body;

    try {
      // CRIA PRODUTO
      const resCadastroProduto = await axios.post("https://www.bling.com.br/Api/v3/produtos", dataNovoProduto,{ headers: {Authorization: `Bearer ${token}`} });

      res.status(201).json({ idProduto: resCadastroProduto.data.data.id, variacoes: resCadastroProduto.data.data.variations.saved });
    } catch (error: any) {
      console.log(error.response)
      res.status(500).json({ erro: error });
    }
  }
  
}
