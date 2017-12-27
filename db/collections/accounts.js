"use strict";

const db = require('sentinel-common').db;

function getCollection(){
    return db.createCollection('accounts');
}

module.exports.find = (key, criteria) => {

    return new Promise( function( fulfill, reject ){

        getCollection()
            .then( (collection) => {
                collection.find(null, key, criteria)
                    .then( function(docs){
                        if (docs) {
                            fulfill( docs[0] );
                        }else{
                            fulfill(null);
                        }
                    })

            })
            .catch(function(err){
                reject(err);
            });
    });
};

module.exports.create = (data) => {

    return new Promise( (fulfill, reject) => {

        getCollection()
            .then( (collection) => {
                collection.insert(null, data)
                    .then(() => {
                        fulfill(data);
                    })
            })
            .catch(function(err){
                reject(err);
            });
    });
};
