'use strict';

//require('newrelic');

const SwaggerExpress = require('swagger-express-mw');
const SwaggerUi = require('swagger-tools/middleware/swagger-ui');
//const jwtVerifier = require('jwt-verifier-client')(require('./config').jwtVerifierUrl);
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const _ = require('underscore');

app.use(bodyParser.json({limit: '50mb'}));
app.use(cookieParser());

app.use(session({secret: 'sentinel', saveUninitialized: true, resave: true}));

// TODO: Refactor later as middleware
const ouath = require('./providers/ouath')(app);

var config = {
    appRoot: __dirname, // required config
    swaggerSecurityHandlers: {}
};

SwaggerExpress.create(config, function (err, swaggerExpress) {
    if (err) {
        throw err;
    }

    app.use(SwaggerUi(swaggerExpress.runner.swagger));

    // install middleware
    swaggerExpress.register(app);

    app.post(`/v1/service/login`, (req, res) => {

    });

    var port = process.env.PORT || 5002;
    app.listen(port);

    if (swaggerExpress.runner.swagger.paths['/health']) {
        console.log(`you can get /health on port ${port}`);
    }
});

module.exports = app;