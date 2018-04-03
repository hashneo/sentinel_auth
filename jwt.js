'use strict';

function jwt() {

    const jsonwebtoken = require('jsonwebtoken');

    this.create = (acct, key) => {

        let claims;

        claims = {
            acc_id: acct.id,
            role: acct.role
        };

        if (process.env.DEBUG){
            claims['key'] = key;
        }

        return makeJwt(claims);
    };

    function makeJwt(payload) {

        return new Promise((fulfill, reject) => {
            payload.iss = 'sentinel';
            payload.exp = Math.trunc(((new Date).getTime() / 1000)) + (60 * 60 * 24 * 30);    // 30 days from now
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
