"use strict";

module.exports = {
    health: main
};

function main(req, res) {
    console.log('/health was called');

    res.json({"status": "ok"});

}
