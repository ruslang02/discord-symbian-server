"use strict";
exports.__esModule = true;
var tls_1 = require("tls");
var fs_1 = require("fs");
var Client_1 = require("./Client");
var _a = process.env.PORT, PORT = _a === void 0 ? 8080 : _a;
var server = new tls_1.Server({
    key: (0, fs_1.readFileSync)("ssl/privkey.pem"),
    cert: (0, fs_1.readFileSync)("ssl/cert.pem"),
    dhparam: (0, fs_1.readFileSync)("ssl/ssl-dhparams.pem"),
    ciphers: "DHE-RSA-AES256-SHA",
    secureProtocol: "TLS_method"
}).listen(PORT);
server.on("listening", function () { return console.log("TCP server is listening on port " + PORT + "."); });
server.on("secureConnection", function (socket) { return new Client_1.Client(socket).handleConnection(); });
