// ESTE ES NUESTRO GATEWAY (PUNTO DE ENTRADA)
import express from 'express';
import proxy from 'express-http-proxy';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { verifyToken } from './bridges/middleware.js';

dotenv.config();
const env = process.env;
const PORT = env.PORT;
const PORT1 = env.PORT2;
const PORT2 = env.PORT3;
const PORT3 = env.PORT4;
console.log(PORT, PORT1, PORT2, PORT3);

const app = express();
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// SERV-LOGINJWT
app.use('/service1', proxy(`http://localhost:${PORT1}`));

//SERV-TOTP2doFAC
app.use(
  '/service2',
  verifyToken,
  proxy(`http://localhost:${PORT2}`, {
    userResHeaderDecorator(headers, userReq, userRes) {
      const cookies = headers['set-cookie'];
      if (cookies) {
        userRes.setHeader('Set-Cookie', cookies);
      }

      return headers;
    },
  })
);

//SERV-RANDOM
app.use('/service3', verifyToken, proxy(`http://localhost:${PORT3}`));

//listen
app.listen(PORT, () => {
  console.log(`API Gateway escuchando en http://localhost:${PORT}`);
});
