// ESTE ES EL ULTIMO MICROSERVICIO Q ES CORRELATIVO A LAS ATENCIONES DE LOS USUARIOS (2 FACTORES)
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const env = process.env;
const port = env.PORT4;

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Inicio de sesión con segundo factor exitoso');
});

// GET-RANDOM
app.get('/search-mercado-libre', async (req, res) => {
  try {
    const resp = await axios.get(
      `https://api.mercadolibre.com/sites/MLA/search?q=${req.query.busq}`
    );

    res.send(resp.data.results);
  } catch (e) {
    console.log(e);
    res.status(500).send('Internal Server Error:', err);
  }
});

app.listen(port, () => {
  console.log(`Servicio 3 escuchando en http://localhost:${port}`);
});
