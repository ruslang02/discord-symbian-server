import { TLSSocket } from "tls";
import WebSocket from "ws";
import { ConnectData } from "./dto/ConnectData";
import { Payload } from "./dto/Payload";
import { UpdateSupportedEventsData } from "./dto/UpdateSupportedEventsData";

const NEW_LINE = "\n".charCodeAt(0);

export class Client {
    private websocket?: WebSocket;
    private supportedEvents: string[] = [];

    constructor(
        private socket: TLSSocket
    ) {}

    private createMessageReceiver = () => {
        let buffer = Buffer.alloc(0);
        this.socket.on("data", (data) => {
            let remaining = Buffer.from(data);
            let index = -1;
            while ((index = remaining.indexOf(NEW_LINE)) !== -1) {
                buffer = Buffer.concat([buffer, remaining.slice(0, index)]);
                remaining = remaining.slice(index + 1);
                this.handleMessage(buffer.toString());
                buffer = Buffer.alloc(0);
            };
            buffer = Buffer.concat([buffer, remaining]);
        });
    }

    /**
     * Handles a client connection to the TCP server.
     */
    public handleConnection = () => {
        this.createMessageReceiver();

        this.socket.on("error", this.handleClose);
        this.socket.on("close", this.handleClose);

        console.log("Client connected.");
        this.sendObject({
            op: -1,
            t: "GATEWAY_HELLO"
        });
    }

    private handleClose = () => {
        console.log("Client disconnected.");
        this.websocket?.close();
    }

    private handleMessage = (message: string) => {
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

    private handleProxyMessage = (payload: Payload) => {
        switch (payload.t) {
            case "GATEWAY_CONNECT":
                this.supportedEvents = (payload.d as ConnectData).supported_events;
                this.connectGateway((payload.d as ConnectData).url);
                break;
            case "GATEWAY_DISCONNECT":
                this.websocket?.close();
                break;
            case "GATEWAY_UPDATE_SUPPORTED_EVENTS":
                this.supportedEvents = (payload.d as UpdateSupportedEventsData).supported_events;
                break;
            default:
        }
    }

    private connectGateway = (gatewayUrl: string) => {
        this.websocket = new WebSocket(gatewayUrl)
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

    sendMessage = (data: string) => {
        console.log("Sending to client: " + data);
        this.socket.write(data + "\n");
    }

    sendObject = (object: any) => {
        this.sendMessage(JSON.stringify(object));
    }
}