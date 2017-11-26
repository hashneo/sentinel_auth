"use strict";

const accounts = require('../../db/collections/accounts');
const tokens = require('../../db/collections/tokens');
const makeJwt = require('../../jwt').makeJwt;
const merge = require('merge');
const guid = require('node-uuid');
const crypto = require('crypto');

function validate(auth){

    if ( auth.socialCredentials ){

        if (auth.email) {
            throw { code: 400, message : 'cannot authenticate using both email and social credentials.' };
        }

        let socialCredentials = auth.socialCredentials;

        if (!socialCredentials.provider) {
            throw { code: 400, message : 'social provider cannot be blank or missing.' };
        }

        if ( !socialCredentials.token ){
            throw { code: 400, message : 'social token cannot be blank or missing.' };
            //res.redirect(`https://koo.io/api/v1/auth/${socialCredentials.provider}`);
            //return;
        }

        return new Promise( (fulfill, reject) => {
            tokens.find(socialCredentials.token)
                .then( (doc) => {
                    if (doc) {
                        tokens.delete(doc)
                            .then(() => {
                                fulfill( {
                                    provider : doc.provider,
                                    id : doc.user.id,
                                    name : doc.user.name
                                });
                            })
                            .catch((err)=>{
                                reject(err);
                            });
                    }else{
                        throw 401;
                    }
                })
                .catch( (err) => {
                    reject(err);
                });
        });

    } else {
        if (!auth.email || !auth.password) {
            throw {code: 400, message: 'email or password cannot be blank or missing.'};
        }

        return new Promise( (fulfill, reject) => {

            try {
                const email = auth.email.toLowerCase();

                const hash = crypto.createHmac('sha256', email)
                    .update(auth.password)
                    .digest('hex');

                fulfill({
                    provider: 'email',
                    id: email,
                    password: hash,
                    name: auth.name
                });
            }catch(err){
                reject(err);
            }
        });
    }
}

function createJwt(acct, res){

    let claims;

    claims = {
        acc_id: acct.id,
    };

    makeJwt(claims)
        .then( (jwt) => {
            res.cookie( 'AUTH', jwt );
            res.status(200).json({id: acct.id});
        })
        .catch( (err) => {
            throw err;
        });
}

function findAccount(auth){

    let k = {
        auth: {
            provider: auth.provider,
            id: auth.id
        }
    };

    return new Promise( (fulfill, reject) => {

        accounts.find(null, k)
            .then((acct) => {
                fulfill(acct || k);
            })
            .catch( (err) => {
                reject(err);
            })
    });

}

module.exports.Login = (req, res) => {

    let auth = req.swagger.params.auth.value;

    validate(auth)
        .then( (criteria) => {
            auth = criteria;
            return findAccount(criteria);
        })
        .then( (acct) => {
            // Social accounts can always login (get created if not)
            new Promise( (fulfill, reject) =>{

                if (acct.auth.provider === 'email') {
                    if (!acct.id)
                        throw {code: 404, message: 'account does not exist.'};

                    if (acct.auth.password !== auth.password)
                        throw {code: 401, message: 'invalid credentials.'};

                    return  fulfill(acct);
                }

                if (!acct.id){
                    createAccount(acct, auth)
                        .then( (acct) =>{
                            fulfill(acct);
                        })
                        .catch( (err) => {
                            reject(err);
                        });
                }else {
                    fulfill(acct);
                }
            })
            .then( (acct) => {
                createJwt(acct, res);
            })
            .catch( (err) => {
                res.status(err.code >= 400 && err.code <= 451 ? err.code : 500).json( { code: err.code || 0, message: err.message } );
            });
        })
};

module.exports.Logout = (req, res) => {
    res.clearCookie('AUTH');
    res.status(200).json({});
};

function createAccount(acct, auth){
    acct = merge(acct, {
        id: guid.v4(),
        name: auth.name,
        created: new Date().toISOString(),
    });

    return accounts.create(acct);
}

module.exports.Register = (req, res) => {

    let auth = req.swagger.params.auth.value;

    validate(auth)
        .then( (criteria) => {
            return findAccount(criteria);
        })
        .then( (acct) => {

            if (!acct.id) {
                return createAccount(acct,auth);
            }
            else {
                // multiple email accounts can't exist
                if ( acct.auth.provider === 'email' )
                    throw {code: 403, message: 'account exists.'};

                // If a social account exists, just do a login.
                return new Promise( (fulfill) => {
                    fulfill(acct);
                });
            }
        })
        .then( (acct) => {
            createJwt(acct, res);
        })
        .catch( (err) => {
            res.status(err.code >= 400 && err.code <= 451 ? err.code : 500).json( { code: err.code || 0, message: err.message } );
        });

};

