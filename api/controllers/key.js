"use strict";

const fs = require('fs');
const path = require('path');

const pubKey = fs.readFileSync( path.normalize( path.resolve( __dirname, '../../config/keys/publickey.pem') ) );

module.exports.getPublicKey = (req, res) => {
    res.status(200).send(pubKey.toString('utf-8'));
};