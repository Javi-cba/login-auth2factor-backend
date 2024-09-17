// ESTE MICROSERVICE SE ENCARGA DEL SEGUNDO FACTOR DE AUTENTICACION (GENERA EL QR Y VERIFICA EL TOTP ENVIADO)
import express from 'express';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;

dotenv.config();
const env = process.env;
const PORT = env.PORT3;

const app = express();
app.use(express.json());

// Conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.get('/', (req, res) => {
  res.send('Respuesta desde el Servicio 2...');
});

app.post('/generate-qr', async (req, res) => {
  let secret = speakeasy.generateSecret({ length: 20 });

  // Crea una URL otpauth que se usará para generar un código QR
  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret.base32,
    label: `${req.body.appName}:${req.body.email}`,
    issuer: 'empresa', // HARDCODEADO DE PRUEBA
    encoding: 'base32',
  });

  // Guarda el secret en la base de datos (para el usuario y la app)
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT sxu_secret FROM secretXusu WHERE sxu_usuario = $1 AND sxu_app = $2',
      [req.body.email, req.body.appName]
    );

    // UPDATE/INSERT
    if (result.rows.length > 0) {
      await client.query(
        'UPDATE secretXusu SET sxu_secret = $1 WHERE sxu_usuario = $2 AND sxu_app = $3',
        [secret.base32, req.body.email, req.body.appName]
      );
    } else {
      await client.query(
        'INSERT INTO secretXusu (sxu_secret, sxu_usuario, sxu_app) VALUES ($1, $2, $3)',
        [secret.base32, req.body.email, req.body.appName]
      );
    }

    // GENERA UN CODIGO QR
    qrcodeTerminal.generate(otpauthUrl, { small: true }, function (qrcode) {
      console.log('QR');
      console.log(qrcode);
    });

    qrcode.toDataURL(otpauthUrl, (err, data_url) => {
      if (err) {
        res.status(500).json({ error: 'Error generando QR' });
      } else {
        res.json({ secret: secret.base32, qrcode: data_url });
      }
    });
  } catch (e) {
    console.log(e);
    res.status(500).send('Internal Server Error:', err);
  } finally {
    client.release();
  }
});

app.post('/verify-totp', async (req, res) => {
  const { tokenTOTP, email, appName } = req.body;

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT sxu_secret FROM secretXusu WHERE sxu_usuario = $1 AND sxu_app = $2',
      [email, appName]
    );

    let secretBD = result.rows.length > 0 ? result.rows[0].sxu_secret : null;
    if (!secretBD) {
      return res.status(400).send('Secret no definido. Genera el QR primero.');
    }

    const verified = speakeasy.totp.verify({
      secret: secretBD,
      encoding: 'base32',
      token: tokenTOTP,
    });

    if (verified) {
      res.send({ verified: true, message: 'Verificación exitosa' }); // el token es correcto
    } else {
      res.send({ verified: false, message: 'Token incorrecto o expirado' }); // el token es incorrecto
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error:', err);
  } finally {
    client.release();
  }
});

// ESTO ES SOLO PARA PROBAR LOS ENDPOINTS DESDE POSTMAN
// CON UN TOKEN GENERADO MANUALMENTE (SIN USAR GOOGLE AUTHENTICATOR)
app.get('/generate-totp', async (req, res) => {
  const { email, appName } = req.query;

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT sxu_secret FROM secretXusu WHERE sxu_usuario = $1 AND sxu_app = $2',
      [email, appName]
    );

    let secretBD = result.rows.length > 0 ? result.rows[0].sxu_secret : null;
    if (!secretBD) {
      return res
        .status(400)
        .send(
          'Secret no definido para el Usuario y/o App. Generar QR primero.'
        );
    }

    //usa el secret para generar el token TOTP
    const token = speakeasy.totp({ secret: secretBD, encoding: 'base32' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`Servicio 2 escuchando en http://localhost:${PORT}`);
});
