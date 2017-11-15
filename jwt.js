/**
 * Created by dorong on 8/26/16.
 */
'use strict';

const fs = require('fs');
const jwt = require('jsonwebtoken');
let cert = fs.readFileSync('./config/keys/privatekey.pem');

function makeJwt(payload) {

    return new Promise( (fulfill, reject) => {
        payload.iss = 'koo.io';
        jwt.sign(payload, cert, {algorithm: 'RS256'}, (err, token) => {
            if (err) {
                reject(err);
            } else {
                fulfill(token);
            }
        });
    });

}

module.exports.makeJwt = makeJwt;