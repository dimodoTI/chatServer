const fs = require('fs');
const https = require('https');
const http = require('http');
const WebSocket = require('ws');

const VET = "vet"
const CLIENT = "cli"
const IKE = "ike"
const TODOS = "todos"
const NEW_CONNECTION = "new-connection"
const DO_ACTION = "do-action"


const server = https.createServer({
    key: fs.readFileSync('certs/ws.chat.ikeargentina.com.ar/key.pem'),
    cert: fs.readFileSync('certs/ws.chat.ikeargentina.com.ar/fullchain.pem')
});

//const server = http.createServer();

const wssecure = new WebSocket.Server({
    server
});


let vets = {};
let clients = {};
let ike = {};

//when a user connects to our sever 
wssecure.on("connection", (connection) => {

    connection.on('message', (message) => {

        let data;

        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {};
        }

        //switching type of the user message 
        switch (data.type) {
            //when a user tries to login 
            case NEW_CONNECTION:

                if (data.id && data.rol) {

                    console.log(NEW_CONNECTION, data)

                    if (data.rol == IKE) {

                        ike[data.id] = {
                            name: data.name,
                            connection: connection
                        }
                    }
                    if (data.rol == VET) {
                        vets[data.id] = {
                            name: data.name,
                            connection: connection
                        }
                    }
                    if (data.rol == CLIENT) {
                        clients[data.id] = {
                            name: data.name,
                            connection: connection
                        }
                    }
                    connection.___identificador_rol = data.rol
                    connection.___identificador_id = data.id
                }
                break;
            case DO_ACTION:
                console.log(DO_ACTION, data)
                if (data.toRol == VET) {
                    broadcastToVets(data.action)
                }
                if (data.toRol == CLIENT) {
                    broadcastToClient(data.toId, data.action)
                }
                if (data.toRol == TODOS) {
                    broadcastToClient(data.toId, data.action)
                    broadcastToVet(data.toId, data.action)
                }

                break;
            default:
                sendTo(connection, {
                    type: "error",
                    message: "Command not found: " + data.type
                });
                break;
        }

    })
    connection.on("close", () => {
        console.log(connection.___identificador_id, " Exit")

        if (connection.___identificador_rol == CLIENT) {
            delete clients[connection.___identificador_id]
        }
        if (connection.___identificador_rol == VET) {
            delete vets[connection.___identificador_id]
        }
        if (connection.___identificador_rol == IKE) {
            delete ike[connection.___identificador_id]
        }

    });
})


const broadcastToVets = (action) => {
    for (let [id, veterinario] of Object.entries(vets)) {
        sendTo(veterinario.connection, {
            type: DO_ACTION,
            action: action
        })
    }
}
const broadcastToVet = (id, action) => {
    if (vets[id]) {
        sendTo(vets[id].connection, {
            type: DO_ACTION,
            action: action
        })
    }
}
const broadcastToClient = (id, action) => {
    if (clients[id]) {
        sendTo(clients[id].connection, {
            type: DO_ACTION,
            action: action
        })
    }
}

const sendTo = (connection, message) => {
    connection.send(JSON.stringify(message));
}

server.listen(9080, '0.0.0.0');