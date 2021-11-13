#!/usr/bin/env node

const qs = require('qs');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const express = require('express');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const jwtAuthz = require("express-jwt-authz");

dotenv.config();

const app = express();

app.use(cors()); // enabling CORS for all requests
app.use(helmet()); // adding Helmet to enhance your API's security
app.use(express.json()); // using bodyParser to parse JSON bodies into JS objects 
app.use(morgan('combined')); // adding morgan to log HTTP requests
app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE, // Validate the audience and the issuer.
  issuer: `https://${process.env.AUTH0_DOMAIN}/`, // Validate the audience and the issuer.
  algorithms: ["RS256"],
});

const checkPermissions = (...permissions) => {
  return jwtAuthz(permissions, {
    customScopeKey: "permissions",
    checkAllScopes: true,
    failWithError: true,
  });
};

app.get('/', (req, res) => {
  res.send('Hello World! Public endpoint');
});

app.get('/private', checkJwt, (req, res) => {
  res.send('Hello World! Private endpoint');
});

app.get('/user/profile', checkJwt, (req, res, next) => {
  const config = {
    headers: {
      'Authorization': req.headers.authorization
    }
  };

  axios(`https://${process.env.AUTH0_DOMAIN}/userinfo`, config)
    .then((response) => { 
      res.status(response.status).json({
        data: response.data
      });
    })
    .catch(error => {
      res.status(error.response.status).json({
        error: error.response.data.error,
        error_description: error.response.data.error_description
      });

      next();
    });
});

app.get('/permissions', [checkJwt, checkPermissions('gestao')], (req, res) => { 
  res.send('Hello World! Endpoint with permission gestao');
});

app.post('/oauth/token', (req, res, next) => {
  const body = {
      grant_type: "password",
      username: req.body.username,
      password: req.body.password,
      audience: process.env.AUTH0_AUDIENCE,
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      scope: "openid"
  };

  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, qs.stringify(body), config)
    .then((response) => { 
      res.status(response.status).json({
        data: response.data
      });
    })
    .catch(error => {
      res.status(error.response.status).json({
        error: error.response.data.error,
        error_description: error.response.data.error_description
      });

      next();
    });
});

app.listen(3000);
