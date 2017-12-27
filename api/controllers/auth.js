"use strict";

const accounts = require('../../db/collections/accounts');
const tokens = require('../../db/collections/tokens');
const jwt = require('../../jwt');
const merge = require('merge');
const guid = require('node-uuid');
const crypto = require('crypto');
const generator = require('generate-password');

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

        if ((!auth.email || !auth.password)) {
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

function findAccount(auth, k){

    if (!k) {
        k = {
            auth: {
                provider: auth.provider,
                id: auth.id
            }
        };
    }

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

function doLogin(auth, req, res){

    return new Promise( (fulfill, reject) => {

        validate(auth)
            .then((criteria) => {
                auth = criteria;
                return findAccount(criteria);
            })
            .then((acct) => {
                // Social accounts can always login (get created if not)
                return new Promise((fulfill, reject) => {

                    if (acct.auth.provider !== 'social') {
                        if (!acct.id)
                            return reject( {code: 404, message: 'account does not exist.'} );

                        if (acct.auth.password !== auth.password)
                            return reject( {code: 401, message: 'invalid credentials.'} );

                        return fulfill(acct);
                    }

                    if (!acct.id) {
                        createAccount(acct, auth)
                            .then((acct) => {
                                fulfill(acct);
                            })
                            .catch((err) => {
                                reject(err);
                            });
                    } else {
                        fulfill(acct);
                    }
                })
            })
            .then((acct) => {
                let key = ( req.connection.encrypted ? 'https' : 'http' ) + '://' + req.headers.host + '/api/auth/publickey';
                return jwt.create(acct, key);
            })
            .then( (jwt) =>{
                fulfill(jwt);
            })
            .catch((err) => {
                reject(err);
            });

    });

}

module.exports.formLogin = (req, res) => {

    let username = req.swagger.params.username.value;
    let password = req.swagger.params.password.value;

    let auth = {
        name: '',
        email: username,
        password: password
    };

    doLogin(auth, req, res)
        .then( (jwt)=>{
            res.cookie('AUTH', jwt);
            //res.status(200).json({id: acct.id});
            res.redirect('/');
        })
        .catch((err) => {
            res.redirect('/');
            /*
            res.status(err.code >= 400 && err.code <= 451 ? err.code : 500).json({
                code: err.code || 0,
                message: err.message
            });
            */
        });
};

module.exports.Login = (req, res) => {
    let auth = req.swagger.params.auth.value;

    doLogin(auth, req, res)
        .then( (jwt)=>{
            res.cookie('AUTH', jwt);
            res.status(200).json({code:0, message:''});
        })
        .catch((err) => {
            res.status(err.code >= 400 && err.code <= 451 ? err.code : 500).json({
                code: err.code || 0,
                message: err.message
            });
        });
};

module.exports.Logout = (req, res) => {
    res.clearCookie('AUTH');
    res.status(200).json({});
};

function createAccount(acct, auth){
    acct = merge(acct, {
        id: guid.v4(),
        name: (auth ? auth.name : acct.name),
        created: new Date().toISOString(),
    });

    if (!acct.role)
        acct['role'] = 'user';

    return accounts.create(acct);
}

module.exports.Register = (req, res) => {

    let data = req.swagger.params.auth.value;

    let hashedPassword;

    validate(data)
        .then( (criteria) => {
            hashedPassword = criteria.password;
            return findAccount(criteria);
        })
        .then( (acct) => {

            if (!acct.id) {
                acct['role'] = data.role;
                acct.auth['password'] = hashedPassword;
                return createAccount(acct, data);
            }
            else {
                return new Promise( (fulfill, reject) => {
                    // multiple email accounts can't exist
                    if (acct.auth.provider !== 'email')
                        reject({code: 403, message: 'account exists.'});

                    // If a social account exists, just do a login.
                    fulfill(acct);
                } );
            }
        })
        .then( (acct) => {
            res.status(200).json({id: acct.id});
            //let key = ( req.connection.encrypted ? 'https' : 'http' ) + '://' + req.headers.host + '/api/auth/publickey';
            //jwt.create(acct, key);
        })
        .catch( (err) => {
            res.status(err.code >= 400 && err.code <= 451 ? err.code : 500).json( { code: err.code || 0, message: err.message } );
        });

};

let initRetry = 5;

function init(){

    let rawPassword = generator.generate({
        length: 36,
        numbers: true
    });

    let auth = {
        email: 'admin@local',
        password : rawPassword
    };

    validate(auth)
        .then( (criteria) => {
            auth = criteria;
            return findAccount(criteria);
        })
        .then( (acct) =>{
            if (!acct.id){

                acct.auth['password'] = auth.password;
                acct['name'] = 'Administrator';
                acct['role' ] = 'admin';

                createAccount( acct )
                .then( (acct) =>{
                    console.log( 'created root account, password => ' + rawPassword );
                })
                .catch( (err) => {
                    console.log(err);
                    process.exit(1);
                });
            } else {
                console.log( 'root account already exists' );
            }
        })
        .catch( (err) => {

            if ( --initRetry == 0 ) {
                console.log(err);
                process.exit(1);
            }

            setTimeout( init, 1000 );
        });
}


init();