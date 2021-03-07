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

  // when the client joins the game
  socket.on('joinGame', (data) => {
    onJoin(socket, data);
  });

  // when the client quits
  socket.on('disconnect', (reason) => {
    onQuit(socket.id);
  });

  // when the player moves or rotates
  socket.on('moved', (data) => {
    // get the index of the player that moved/rotated
    const playerIndex = getPlayerIndex(socket.id);

    // update the position and rotation of the player
    players[playerIndex].position = data.newPosition;
    players[playerIndex].rotation = data.newRotation;

    // console.log('Player\t%s moved, position:\t%s, rotation:\t%s',
    //   players[playerIndex].id, players[playerIndex].position,
    //   players[playerIndex].rotation);

    // emit the updatePlayers socket event
    socket.broadcast.emit('updatePlayers', {players: players});
  });
});

// used to get a player from the database given an id
const getPlayerIndex = (id) => {
  // loop through each player in the database
  for (var i = 0; i < players.length; i++) {
    if (players[i].id == id) {
      return i;
    }
  }
}

// called when a new client connects
const onJoin = (socket, playerData) => {
  // create the new player object
  var newPlayer = {
    id: socket.id,
    name: playerData.name,
    team: playerData.team,
    position: {x:0, y:0, z:0},
    rotation: {x:0, y:0, z:0, w:0}
  };

  // add the new client id to the list of connections
  players.push(newPlayer);

  // log which player was added and the list of players
  console.log('Connection ' + socket.id + ' added. \t\t# of connections: '
    + players.length);
  console.log(players);

  // invoke the spawnInitialPlayers event this socket
  socket.emit('spawnInitialPlayers', {players: players});

  socket.emit('getInitialData', {numOfPlayers: players.length});

  // invoke the playerJoined event to all other socket
  socket.broadcast.emit('playerJoined', {player: newPlayer});
}

// called when a client disconnects
const onQuit = (id) => {
  // remove the client's id from the list of players
  for (var i = 0; i < players.length; i++) {
    if (players[i].id == id) {
      // invoke the usersChanged event
      io.emit('playerQuit', {player: players[i]});

      // remove the player from the list of players
      players.splice(i, 1);

      // log which player was removed and the list of players left
      console.log('Connection ' + id + ' removed. \t# of connections: '
        + players.length);
      console.log(players);
    }
  }
}
