"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.Client = void 0;
var ws_1 = __importDefault(require("ws"));
var NEW_LINE = "\n".charCodeAt(0);
var Client = /** @class */ (function () {
    function Client(socket) {
        var _this = this;
        this.socket = socket;
        this.supportedEvents = [];
        this.createMessageReceiver = function () {
            var buffer = Buffer.alloc(0);
            _this.socket.on("data", function (data) {
                var remaining = Buffer.from(data);
                var index = -1;
                while ((index = remaining.indexOf(NEW_LINE)) !== -1) {
                    buffer = Buffer.concat([buffer, remaining.slice(0, index)]);
                    remaining = remaining.slice(index + 1);
                    _this.handleMessage(buffer.toString());
                    buffer = Buffer.alloc(0);
                }
                ;
                buffer = Buffer.concat([buffer, remaining]);
            });
        };
        /**
         * Handles a client connection to the TCP server.
         */
        this.handleConnection = function () {
            _this.createMessageReceiver();
            _this.socket.on("error", _this.handleClose);
            _this.socket.on("close", _this.handleClose);
            console.log("Client connected.");
            _this.sendObject({
                op: -1,
                t: "GATEWAY_HELLO"
            });
        };
        this.handleClose = function () {
            var _a;
            console.log("Client disconnected.");
            (_a = _this.websocket) === null || _a === void 0 ? void 0 : _a.close();
        };
        this.handleMessage = function (message) {
            var _a;
            console.log("Received a message from client:", message);
            try {
                var parsed = JSON.parse(message);
                if ("op" in parsed && parsed.op === -1) {
                    _this.handleProxyMessage(parsed);
                }
                else {
                    (_a = _this.websocket) === null || _a === void 0 ? void 0 : _a.send(message);
                }
            }
            catch (e) {
                console.log(e);
            }
        };
        this.handleProxyMessage = function (payload) {
            var _a;
            switch (payload.t) {
                case "GATEWAY_CONNECT":
                    _this.supportedEvents = payload.d.supported_events;
                    _this.connectGateway(payload.d.url);
                    break;
                case "GATEWAY_DISCONNECT":
                    (_a = _this.websocket) === null || _a === void 0 ? void 0 : _a.close();
                    break;
                case "GATEWAY_UPDATE_SUPPORTED_EVENTS":
                    _this.supportedEvents = payload.d.supported_events;
                    break;
                default:
            }
        };
        this.connectGateway = function (gatewayUrl) {
            _this.websocket = new ws_1["default"](gatewayUrl)
                .on("error", function (e) {
                console.error(e);
                _this.sendObject({
                    op: -1,
                    t: "GATEWAY_DISCONNECT",
                    d: {
                        message: e.message.toString()
                    }
                });
                _this.socket.destroy();
            })
                .on("close", function (code, reason) {
                _this.sendObject({
                    op: -1,
                    t: "GATEWAY_DISCONNECT",
                    d: {
                        message: reason.toString()
                    }
                });
                _this.socket.destroy();
            })
                .on("unexpected-response", console.error)
                .on("message", function (json) {
                var _a;
                var t = (_a = json.toString().match(/"t":"([A-Z_]+)".+/)) === null || _a === void 0 ? void 0 : _a[1];
                if (!t || !_this.supportedEvents.length || _this.supportedEvents.includes(t))
                    _this.sendMessage(json.toString());
            });
        };
        this.sendMessage = function (data) {
            console.log("Sending to client: " + data);
            _this.socket.write(data + "\n");
        };
        this.sendObject = function (object) {
            _this.sendMessage(JSON.stringify(object));
        };
    }
    return Client;
}());
exports.Client = Client;
