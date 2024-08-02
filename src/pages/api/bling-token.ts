import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { code } = req.query;
  const clientId = '71a6e58ecb01390816d67f708d256e487cf1fe9f';
  const clientSecret = '724e1d865cecdaa5e596bc3254645f7d9329476d88984acf737b1b9149d1'; 

  try {
    const response = await axios({
      method: "POST",
      url: "https://www.bling.com.br/Api/v3/oauth/token",
      data: {
        grant_type: 'authorization_code',
        code: code
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      }
    })

    res.status(200).json(response.data);
  } catch (erro: any) {
    res.status(500).json({ error: erro.response.data });
  }
}
