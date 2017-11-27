"use strict";

const fs = require('fs');
const path = require('path');

module.exports.getPublicKey = (req, res) => {
    res.status(200).send(global.config.keys.public);
};