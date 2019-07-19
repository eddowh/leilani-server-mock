import fs from 'fs';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import jsonServer from 'json-server';
import dotenv from 'dotenv';

dotenv.config();

const jsonParser = bodyParser.json();

const importFromJson = jsonFile => {
  return JSON.parse(
    fs.readFileSync(jsonFile, 'UTF-8')
  );
}

const server = jsonServer.create();
const router = jsonServer.router('./db.json');
const routingRules = importFromJson('./routes.json');
const userDb = importFromJson('./users.json');

// Set default middlewares (logger, static, cors and no-cache)
server.use(jsonServer.defaults());
server.use(jsonParser);

const SECRET_KEY = process.env.SECRET_KEY;
const expiresIn = '1h';

// Token functions
const createToken = payload => {
  return jwt.sign(payload, SECRET_KEY, {expiresIn});
}

const verifyToken = token => {
  return jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ?  decode : err);
}

const isAuthenticated = ({email, password}) => {
  return userDb.users.findIndex(user => user.email === email && user.password === password) !== -1
}

// POST /auth/login endpoint
server.post('/auth/login', (req, res) => {
  const {email, password} = req.body
  if (!isAuthenticated({email, password})) {
    const status = 401;
    const message = 'Incorrect email or password';
    res.status(status).json({status, message});
    return;
  }

  const access_token = createToken({email, password});
  res.status(200).json({
    user: email,
    access_token
  });
})

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401;
    const message = 'Bad authorization header';
    res.status(status).json({status, message});
    return;
  }
  try {
    const token = req.headers.authorization.split(' ')[1];
    verifyToken(token);
    next();
  }
  catch (err) {
    const status = 401;
    const message = 'Error: access_token is not valid';
    res.status(status).json({status, message});
  }
})

server.use(jsonServer.rewriter(routingRules));
server.use(router);
server.listen(3000, () => {
  console.log('Running JWT-authenticated mock server');
})