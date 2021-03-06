const socket = io({transports: ['websocket'], upgrade: false});

// to be called when this client joins the game
const joinGame = (playerName, playerTeam) => {
  socket.emit('joinGame', {name: playerName, team: playerTeam});
}

// emitted when the player connects
socket.on('getInitialData', (data) => {
  // set the initial score
  updateScore(data.redScore, data.blueScore);
});

// emitted when a new shot was made
socket.on('shotMade', (data) => {
  // create a new bullet
  var bullet = document.createElement('a-entity');

  bullet.setAttribute('bullet', {
    // birthTime: data.shot.birthTime,
    lifespan: data.shot.lifespan,
    team: data.shot.team,
    speed: data.shot.speed,
    direction: data.shot.direction,
    startPos: data.shot.position
  });

  // add the bullet to the bullets holder element
  document.querySelector('#bullets').appendChild(bullet);
});

// emitted when the score is to be updated
socket.on('updateScore', (data) => {
  updateScore(data.red, data.blue);
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
    'removePlayer', {player: data.player});
});
