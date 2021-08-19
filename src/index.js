import { Server, TLSSocket } from "tls";
import { readFileSync } from "fs";
import { Duplex } from "stream";
import WebSocket from "ws";

const { PORT = 8080 } = process.env;

const server = new Server({
    key: readFileSync("ssl/privkey.pem"),
    cert: readFileSync("ssl/cert.pem"),
    dhparam: readFileSync("ssl/ssl-dhparams.pem"),
    ciphers: "DHE-RSA-AES256-SHA",
    secureProtocol: "TLS_method"
}).listen(PORT);

const newLine = "\n".charCodeAt(0);

server.on("listening", () => console.log(`TCP server is listening on port ${PORT}.`));
server.on("secureConnection", socket => new Client(socket).handleConnection());

class Client {
    /**
     * @type {TLSSocket & Duplex}
     */
    socket;
    /**
     * @type {WebSocket | undefined}
     */
    websocket;
    /**
     * @type {string[]}
     */
    supportedEvents = [];

    constructor(socket) {
        this.socket = socket;
    }

    /**
     * Handles a client connection to the TCP server.
     */
    handleConnection = () => {
        let buffer = Buffer.alloc(0);
        this.socket.on("data", (data) => {
            let remaining = Buffer.from(data);
            let index = -1;
            while ((index = remaining.indexOf(newLine)) !== -1) {
                buffer = Buffer.concat([buffer, remaining.slice(0, index)]);
                remaining = remaining.slice(index + 1);
                this.handleMessage(buffer.toString());
                buffer = Buffer.alloc(0);
            };
            buffer = Buffer.concat([buffer, remaining]);
        });

        this.socket.on("error", this.handleClose);
        this.socket.on("close", this.handleClose);

        console.log("Client connected.");
        this.sendObject({
            op: -1,
            t: "GATEWAY_HELLO"
        });
    }

    handleClose = () => {
        console.log("Client disconnected.");
        this.websocket?.close();
    }

    /**
     * Handles processing of a message from the client.
     * @param {string} message
     */
    handleMessage = (message) => {
        console.log("Received a message from client:", message);
        try {
            const parsed = JSON.parse(message);
            if ("op" in parsed && parsed.op === -1) {
                this.handleProxyMessage(parsed);
            } else {
                this.websocket?.send(message);
            }
        } catch (e) {
            console.log(e);
        }
    }

    /**
     * Handles processing of a message for the proxy service.
     * @param {{ pr: number }} parsed
     */
    handleProxyMessage = (parsed) => {
        switch (parsed.t) {
            case 0:
                break;
            case "GATEWAY_CONNECT":
                if (parsed.d) {
                    this.supportedEvents = parsed.d;
                    console.log(this.supportedEvents);
                }
                this.connectGateway();
                break;
            case "GATEWAY_DISCONNECT":
                this.websocket?.close();
                break;
            case "GATEWAY_UPDATE_SUPPORTED_EVENTS":
                this.supportedEvents = parsed.d;
                break;
            default:
        }
    }

    connectGateway = () => {
        this.websocket = new WebSocket("wss://gateway.discord.gg/?v=9&encoding=json")
            .on("error", e => {
                console.error(e);
                this.sendObject({
                    op: -1,
                    t: "GATEWAY_DISCONNECT",
                    d: {
                        message: e.message.toString()
                    }
                });
                this.socket.destroy();
            })
            .on("close", (code, reason) => {
                this.sendObject({
                    op: -1,
                    t: "GATEWAY_DISCONNECT",
                    d: {
                        message: reason.toString()
                    }
                });
                this.socket.destroy();
            })
            .on("unexpected-response", console.error)
            .on("message", json => {
                const t = json.toString().match(/"t":"([A-Z_]+)".+/)?.[1];

                if (!t || !this.supportedEvents.length || this.supportedEvents.includes(t))
                    this.sendMessage(json.toString());
            });
    }

    /**
     * Sends the message to the TCP client.
     * @param {string} str
     */
    sendMessage = (str) => {
        console.log("Sending to client: " + str);
        this.socket.write(str + "\n");
    }

    sendObject = (object) => {
        this.sendMessage(JSON.stringify(object));
    }
}
