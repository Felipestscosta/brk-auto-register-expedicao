import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { code } = req.query;
  const clientId = `${process.env.NEXT_PUBLIC_BLING_API_CLIENT_ID}`;
  const clientSecret = `${process.env.NEXT_PUBLIC_BLING_API_CLIENT_SECRET}`; 

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
