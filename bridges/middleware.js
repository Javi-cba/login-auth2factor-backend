// ACA ES DONDE VAN MIS MIDDLEWARE
import speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();
const env = process.env;
const JWT_SECRET = env.JWT_SECRET;

// Conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

//MIDDLEWARE1 verifyToken: para verificar el token antes de permitir el acceso a los microservicios
// este toke lo van a tener los usuarios q hayan iniciado sesión
const verifyToken = (req, res, next) => {
  const token = req.cookies.token; // Obtiene el token de la cookie
  if (!token) {
    return res
      .status(401)
      .json({ error: 'Debes iniciar sesión primero, para generar un Token' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalido o caducado' });
    }
    req.user = decoded;
    next();
  });
};

// MIDDLEWARE2 verifyTOTP: verifica q el secretxUsu de la bd sea válido, antes de permitir el acceso a /service3
// esto puede ser OPCIONAL para los usuarios q quieran hacer uso del segundo factor
const verifyTOTP = async (req, res, next) => {
  const { token, email, appName } = req.query;
  console.log(token, email, appName);
  try {
    if (!token || !email || !appName) {
      return res
        .status(401)
        .json({ error: 'Faltan parámetros para la verificación TOTP' });
    }

    const client = await pool.connect();
    const result = await client.query(
      'SELECT sxu_secret FROM secretXusu WHERE sxu_usuario = $1 AND sxu_app = $2',
      [email, appName]
    );

    let secretBD;
    result.rows.forEach(row => {
      secretBD = row.sxu_secret;
    });

    if (!secretBD) {
      return res
        .status(400)
        .json({ error: 'Secret no definido. Generar QR primero.' });
    }

    const verified = speakeasy.totp.verify({
      secret: secretBD,
      encoding: 'base32',
      token: token,
    });

    if (verified) {
      next(); // permitir el acceso
    } else {
      res.status(400).json({ error: 'Token TOTP no válido' }); // denegar el acceso
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export { verifyToken, verifyTOTP };
