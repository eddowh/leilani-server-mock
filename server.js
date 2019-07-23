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
let userDb = importFromJson('./users.json');

// Set default middlewares (logger, static, cors and no-cache)
server.use(jsonServer.defaults());
server.use(jsonParser);

const SECRET_KEY = process.env.SECRET_KEY;
const ACCESS_EXPIRES_IN  = '30m';
const REFRESH_EXPIRES_IN = '2h';

// Token functions
const createAccessToken = payload => {
  const accessPayload = { ...payload, token_type: 'ACCESS' };
  return jwt.sign(accessPayload, SECRET_KEY, {expiresIn: ACCESS_EXPIRES_IN});
}

const createRefreshToken = payload => {
  const refreshPayload = { ...payload, token_type: 'REFRESH' };
  return jwt.sign(refreshPayload, SECRET_KEY, {expiresIn: REFRESH_EXPIRES_IN});
}

const verifyToken = token => {
  return jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ?  decode : err);
}

const findUser = email => {
  const userIndex = userDb.users.findIndex(user => user.email === email);
  return (userIndex !== -1) ? { ...userDb.users[userIndex] } : null;
}

const addUser = ({name, email, password}) => {
  const id = userDb.users.length + 1;
  const newUser = { id, name, email, password }
  const newUserDb = {
    users: [ ...userDb.users, newUser ],
  }

  fs.writeFile(
    './users.json', JSON.stringify(newUserDb, null, 4), 'UTF-8',
    () => { userDb = importFromJson('./users.json'); }
  );
  return newUser;
}

const isAuthenticated = ({email, password}) => {
  const user = findUser(email);
  if (!user)
    return false;
  if (user.password !== password)
    return false;
  return true;
}

// POST /auth/login endpoint
server.post('/auth/login', (req, res) => {
  const {email, password} = req.body
  console.log(email);
  console.log(isAuthenticated(email, password));
  if (!isAuthenticated({email, password})) {
    const status = 401;
    const message = 'Incorrect email or password';
    res.status(status).json({status, message});
    return;
  }
  // if the code reaches this point you know they're authenticated
  const { name } = findUser(email);
  const access_token = createAccessToken({ email, password });
  const refresh_token = createRefreshToken({ email, password });
  res.status(200).json({
    user: { name, email },
    access_token,
    refresh_token,
  });
})

// POST /auth/login endpoint
server.post('/auth/signup', (req, res) => {
  const {name, email, password} = req.body;

  if (!name || !email || !password || findUser(email)) {
    const status = 400;
    const message = 'Email taken already';
    res.status(status).json({status, message});
    return;
  }

  const user = addUser({name, email, password});
  res.status(200).json({ user });
})

// POST /auth/refresh endpoint
server.post('/auth/refresh', (req, res) => {
  const refreshToken = verifyToken(req.body.refresh_token);

  if (refreshToken.token_type !== 'REFRESH' || refreshToken instanceof Error) {
    const status = 401;
    const message = 'Error: refresh_token is not valid';
    res.status(status).json({status, message});
    return;
  }

  const { email, password } = refreshToken;
  const newAccessToken = createAccessToken({email, password});
  const newRefreshToken = createRefreshToken({email, password})

  res.status(200).json({
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
  });
})

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  const getUrlBits = (url) => {
    return url.split('/').filter(s => s !== "");
  }
  const urlBits = getUrlBits(req.originalUrl);

  const gettingSingularProduct = (
    req.method == "GET" &&
    urlBits[0] === "products" &&
    Number.isInteger(Number(urlBits[1]))
  )

  const gettingProducts = (
    req.method === "GET" &&
    urlBits[urlBits.length - 1] === "products"
  )

  // Everyone can read the products
  if (gettingSingularProduct || gettingProducts) {
    next();
    return;
  }

  // Any other URL will have to go through JWT authentication
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401;
    const message = 'Bad authorization header';
    res.status(status).json({status, message});
    return;
  }
  
  const access_token = req.headers.authorization.split(' ')[1];
  const tokenObj = verifyToken(access_token);

  if (tokenObj instanceof Error) {
    const status = 401;
    const message = 'Error: access_token is not valid';
    res.status(status).json({status, message});
    return;
  }

  next();
})

server.use(jsonServer.rewriter(routingRules));
server.use(router);
server.listen(3000, () => {
  console.log('Running JWT-authenticated mock server');
})