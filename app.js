const express = require('express');
const app     = express();
const http    = require('http');
const server  = http.createServer(app);
const io      = require('socket.io')(server);

const port = 8080;
server.listen(port);
app.use(express.static(__dirname + '/public'));
console.log('Listening on port ' + port);

// create routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// keep track of connections
var players = [];

// set up socket.io session
io.on('connection', socket => {

  // when the client connects
  onConnect(socket);

  // when the client disconnects
  socket.on('disconnect', (reason) => {
    onDisconnect(socket);
  });

  // when the player moves
  socket.on('moved', (data) => {
    // loop through each player in the list
    for (var i = 0; i < players.length; i++) {
      // if this is the player that has moved (the socket)
      if (players[i].id == socket.id) {
        // update the position of the player
        players[i].position = data.newPosition;

        console.log('Player\t%s moved, new position:\t%s',
          players[i].id, players[i].position);

        // emit the updatePlayers socket event
        socket.broadcast.emit('updatePlayers', {players: players});
      }
    }
  });
});

// called when a new client connects
onConnect = (socket) => {
  // add the new client id to the list of connections
  players.push({id: socket.id, name: '', position: {x:0, y:0, z:0}});

  // log which player was added and the list of players
  console.log('Connection ' + socket.id + ' added. \t\t# of connections: '
    + players.length);
  console.log(players);

  // invoke the spawnInitialPlayers event this socket
  socket.emit('spawnInitialPlayers', {players: players});

  // invoke the playerJoined event to all other socket
  socket.broadcast.emit('playerJoined', {player:
    {id: socket.id, name: '', position: [0, 0, 0]}});
}

// called when a client disconnects
onDisconnect = (socket) => {
  // remove the client's id from the list of connections
  for (var i = 0; i < players.length; i++) {
    if (players[i].id == socket.id) {
      // remove the player from the list of players
      players.splice(i, 1);

      // log which player was removed and the list of players left
      console.log('Connection ' + socket.id + ' removed. \t# of connections: '
        + players.length);
      console.log(players);

      // invoke the usersChanged event
      io.emit('playerQuit', {playerId: socket.id});
    }
  }

}
