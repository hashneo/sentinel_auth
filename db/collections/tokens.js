"use strict";

const db = require('sentinel-common').db;
const collection = db.createCollection('tokens');

module.exports.find = (key, criteria) => {

    return new Promise( function( fulfill, reject ){

        collection.find(null, key, criteria)
            .then( function(docs){
                if (docs) {
                    fulfill( docs[0] );
                }else{
                    fulfill(null);
                }
            })
            .catch(function(err){
                reject(err);
            });
    });
};

module.exports.save = (data) => {

    return new Promise( (fulfill, reject) => {

        collection.insert(null, data)
            .then( () => {
                fulfill(data);
            })
            .catch( (err) => {
                if ( err.code === 11000 ){
                    module.exports.delete(data)
                        .then( () => {
                            return module.exports.save(data);
                        })
                        .then( () => {
                            fulfill(data);
                        })
                        .catch( (err) => {
                            reject(err);
                        });
                    return;
                }
                reject(err);
            });
    });
};

module.exports.delete = (data) => {

    return new Promise( (fulfill, reject) => {

        collection.delete(null, data)
            .then( () => {
                fulfill(data);
            })
            .catch( (err) => {
                reject(err);
            });
    });
};
