'use strict';

const fs = require('fs');
const jwt = require('jsonwebtoken');

function makeJwt(payload) {

    return new Promise( (fulfill, reject) => {
        payload.iss = 'sentinel';
        jwt.sign(payload, global.config.keys.private, {algorithm: 'RS256'}, (err, token) => {
            if (err) {
                reject(err);
            } else {
                fulfill(token);
            }
        });
    });

}

module.exports.makeJwt = makeJwt;