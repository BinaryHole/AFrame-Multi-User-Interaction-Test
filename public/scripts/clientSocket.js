var name = '';
const socket = io({transports: ['websocket'], upgrade: false});

// called when the player changes their name
setName = (data) => {
  name = data.newName;
  socket.emit('setName', {name: data.newName});
}

// emitted when the player connects
socket.on('getInitialData', (data) => {

});

// emitted to update the position of all players on the client
socket.on('updatePlayers', (data) => {
  // get the players-controller
  var playersController = document.querySelector('[players-controller]');

  // loop through each player in the data list
  for (var i = 0; i < data.players.length; i++) {
    // update the current player from the list
    playersController.emit('updatePlayer', {player: data.players[i]});
  }
});

// emitted at the beginning to get all currently connected players
socket.on('spawnInitialPlayers', (data) => {
  // get the players-controller
  var playersController = document.querySelector('[players-controller]');

  // loop through each player in the data list
  for (var i = 0; i < data.players.length; i++) {
    // make sure the current player is not ourself
    if (data.players[i].id != socket.id) {
      // add the connected player from the list
      playersController.emit('addPlayer', {player: data.players[i]});
    }
  }
});

// emitted to add a new player on the client side
socket.on('playerJoined', (data) => {
  document.querySelector('[players-controller]').emit(
    'addPlayer', {player: data.player});
});

// emitted to remove a player on the client side
socket.on('playerQuit', (data) => {
  document.querySelector('[players-controller]').emit(
    'removePlayer', {playerId: data.playerId});
});
