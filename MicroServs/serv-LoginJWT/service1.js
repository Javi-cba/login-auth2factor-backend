// ESTE ES EL MICROSERVICIO Q CONTROLA EL LOGIN Y DEVUELVE EL TOKEN
import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const env = process.env;
const app = express();
const PORT = env.PORT2;
const JWT_SECRET = env.JWT_SECRET;


const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('Respuesta desde el Servicio 1');
});

app.get('/login-jwt', async (req, res) => {
  const { email, password } = req.query;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT usu_email FROM usuario WHERE usu_email=$1 AND usu_contrasenia = $2;',
      [email, password]
    );

    // VERIFICA SI EL USUARIO EXISTE
    if (rows.length > 0) {
      const token = generateToken({ email });

      // Establece la cookie en la respuesta
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        maxAge: 2 * 60 * 60 * 1000,
        sameSite: 'Strict',
      });

      res.status(200).send({ message: 'Usuario autenticado' });
    } else {
      res.status(401).json({ error: 'Usuario y/o contraseña incorrectos' });
    }
  } catch (e) {
    console.log(e);
  } finally {
    client.release();
  }
});

//GENERA EL TOKEN
const generateToken = user => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '2h' });
};

app.listen(PORT, () => {
  console.log(`Servicio 1 escuchando en http://localhost:${PORT}`);
});
