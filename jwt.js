'use strict';

function jwt() {

    const jsonwebtoken = require('jsonwebtoken');

    this.create = (acct, key) => {

        let claims;

        claims = {
            acc_id: acct.id,
            key: key,
            role: acct.role
        };

        return makeJwt(claims);
    };

    function makeJwt(payload) {

        return new Promise((fulfill, reject) => {
            payload.iss = 'sentinel';
            payload.exp = Math.trunc(((new Date).getTime() / 1000)) + (60 * 60);    // 60 minutes from now
            jsonwebtoken.sign(payload, global.config.keys.private, {algorithm: 'RS256'}, (err, token) => {
                if (err) {
                    reject(err);
                } else {
                    fulfill(token);
                }
            });
        });

    }

}

module.exports = new jwt();