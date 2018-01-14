"use strict";

const accounts = require('../../db/collections/accounts');
const jwt = require('../../jwt');

function swapToken(req){

    return new Promise( (fulfill, reject) =>{

        let id = req.jwt.acc_id;

        let k = {
            id: id
        };

        accounts.find(null, k)
            .then((acct) => {
                if (!acct)
                    return reject( {code: 404, message: 'account does not exist.'} );

                let key = ( req.connection.encrypted ? 'https' : 'http' ) + '://' + req.headers.host + '/api/auth/publickey';

                let roles = acct.role.split(',');

                if ( (roles.indexOf('admin') !== -1) && (roles.indexOf('user') === -1) ){
                    roles.push('user');
                }

                acct.role = roles.join(',');

                return jwt.create(acct, key);
            })
            .then( (jwt) => {
                fulfill(jwt);
            })
            .catch( (err) => {
                reject(err);
            });
    });
}

module.exports.getRefresh = (req, res) => {

    swapToken(req)
        .then( (jwt)=>{
            res.cookie('AUTH', jwt);
            res.status(200).json({id: req.jwt.acc_id});
        })
        .catch((err) => {
            res.status(err.code >= 400 && err.code <= 451 ? err.code : 500).json({
                code: err.code || 0,
                message: err.message
            });
        });


};