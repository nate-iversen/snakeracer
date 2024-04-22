import express from 'express';
let app = express();
import http from 'http';
let server = http.Server(app);   
import { Sequelize, Op } from 'sequelize'
import { Server } from "socket.io";
const io = new Server(server, {
    // ...
});
let webSockets = {} // userID: webSocket

server.listen(process.env.PORT || 3003, '127.0.0.1', function () {
    console.log('process.env: ', process.env);
    console.log(`Listening on ${server.address().port}`);
});

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
app.use(express.static(__dirname));  //Mounting middleware function files
app.get('/', (req, res)=>{
    return res.status(200).sendFile(__dirname + '/sdk/index.html');
});
app.get('/game', (req, res)=>{
    return res.status(200).sendFile(__dirname + '/game/game.html');
});
app.get('/sdk/docs', (req, res)=>{
    return res.status(200).sendFile(__dirname + '/sdk/docs/index.html');
});

io.on('connection', function (socket) {
    console.log("SOCKET CONNECTED!");
    if (io.engine.clientsCount <= 1) {
        socket.emit("setAsHost");
    }
    else {
        socket.emit("setAsGuest");
    }
    
    socket.on('disconnect', async (reason) => {
        console.log("SOCKET DISCONNECTED!");
        console.log(socket.id);
        console.log(reason);
        let ids = io.sockets.sockets.keys();
        if (io.engine.clientsCount == 1 && ids) {
            io.to(Array.from(ids)[0]).emit("setAsHost");
        }
    });
    socket.on('startGame', (gameID, SCID, SCUN) => {
        io.emit("allJoined");
    });
    socket.on('resetGame', (gameID, SCID, SCUN) => {
        io.emit("resetGame");
    });
    socket.on('PlayerData', (SCID, gameData) => {
        HandlePlayerData(socket.id, SCID, gameData);
    });
    socket.on('GameOver', (gameID, SCID, SCUN, winner)=>{
        GameOver(socket.id, SCID, winner);
    });

});

async function HandlePlayerData(socketid, SCID, playerData) {
    let sentData = {}
    sentData[SCID] = JSON.parse(playerData);
    sentData[SCID]["nickname"] = SCID;
    let myData = {}
    myData["me"] = sentData[SCID];
    io.to(socketid).emit('playerData', JSON.stringify(myData));
    let otherPlayers = Array.from(io.sockets.sockets.keys()).filter(item => item !== socketid)
    otherPlayers.forEach((player) => {
        io.to(player).emit('playerData', JSON.stringify(sentData));
    });
}

function GameOver(socketid, SCID, winner){
    let otherPlayers = Array.from(io.sockets.sockets.keys()).filter(item => item !== socketid)
    if (winner) {
        otherPlayers.forEach((player) => {
            io.to(player).emit('gameOver');
        });    
    }
}