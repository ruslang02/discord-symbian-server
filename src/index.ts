import { Server } from "tls";
import { readFileSync } from "fs";
import { Client } from "./Client";

const { PORT = 8080 } = process.env;

const server = new Server({
    key: readFileSync("ssl/privkey.pem"),
    cert: readFileSync("ssl/cert.pem"),
    dhparam: readFileSync("ssl/ssl-dhparams.pem"),
    ciphers: "DHE-RSA-AES256-SHA",
    secureProtocol: "TLS_method"
}).listen(PORT);

server.on("listening", () => console.log(`TCP server is listening on port ${PORT}.`));
server.on("secureConnection", socket => new Client(socket).handleConnection());