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
io.on('connection', (socket) => {

  // when the client connects
  onConnect(socket);

  // when the client disconnects
  socket.on('disconnect', () => {
    onDisconnect(socket);
  });
  // when the player moves
  socket.on('moved', (newPosition) => {
    for (i in players) {
      if (players[i].id == socket.id) {
        i.position = newPosition;
        console.log('Player\t' + players[i].id + ' moved, new position:\t' + newPosition);
      }
    }
  });
});

// called when a new client connects
onConnect = (socket) => {
  // add the new client id to the list of connections
  players.push({id: socket.id, name: '', position: [0, 0, 0]});
  console.log('Connection ' + socket.id + ' added. \t\t# of connections: ' + players.length);

  // invoke the usersChanged event
  io.sockets.emit('usersChanged', {users: players});
}

// called when a client disconnects
onDisconnect = (socket) => {
  // remove the client's id from the list of connections
  for (i in players) {
    if (players[i].id == socket.id) {
      players.splice(players[i], 1);
      console.log('Connection ' + socket.id + ' removed. \t# of connections: ' + players.length);
    }
  }

  // invoke the usersChanged event
  io.sockets.emit('usersChanged', {users: players});
}
