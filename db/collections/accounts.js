"use strict";

const db = require('sentinel-common').db;
const collection = db.createCollection('accounts');

module.exports.find = (key, criteria) => {

    return new Promise( function( fulfill, reject ){

        collection.find(null, key, criteria)
            .then( function(docs){
                if (docs) {
                    fulfill( sanitize(docs[0]) );
                }else{
                    fulfill(null);
                }
            })
            .catch(function(err){
                reject(err);
            });
    });
};

module.exports.create = (data) => {

    return new Promise( (fulfill, reject) => {

        collection.insert(null, data)
            .then( () => {
                fulfill(data);
            })
            .catch( (err) => {
                reject(err);
            });
    });
};

function sanitize(doc) {

    doc.contactDetails = [];
    Object.keys(doc).forEach( (key) => {
        if ( Array.isArray( doc[key] ) ) {
            if ( sanitizers[key] !== undefined ) {
                doc[key] = sanitizers[key](doc[key]);
            }
        }
    });

    return doc;
};

var sanitizers = {
};