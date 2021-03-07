// The Player component
AFRAME.registerComponent('player', {
  schema: {
    moveThreshold: {type:'number', default: 0.1},
    rotationThreshold: {type: 'number', default: 0.1},
    team: {type: 'string', default: 'green'}
  },

  init: function() {
    this.ship = this.el.querySelector('.ship');

    // set up initial vars
    this.lastPosition = getPosition(this.ship);
    this.lastRotation = getRotation(this.ship);

    // set the initial colour of the player to pink to tell if it doesn't get
    // updated correctly
    this.setTeam(_PLAYERTEAM);

    // set up an event for setting the team of the player (to be emitted when
    // the client player joins)
    this.el.addEventListener('setTeam', function (data) {
      console.log('setting player team to ' + data.team);

      this.setTeam(data.team);
    });
  },

  setTeam: function(team) {
    // update the team and color of the player
    this.data.team = team;
    this.ship.setAttribute('color', this.data.team);

    // set the colour of the player's trail
    this.el.querySelector('[trail]')
      .setAttribute('trail', {color: this.data.team})
  },

  tick: function() {
    var newPosition = getPosition(this.ship);
    var newRotation = getRotation(this.ship);
    var shouldEmit  = false;

    // check if the player has moved more than the threshold amount
    if (hasMovedAmount(this.ship, this.lastPosition, this.data.moveThreshold)) {
      // update the last position
      this.lastPosition = newPosition;
      shouldEmit = true;

    } else if (hasRotatedAmount(this.ship, this.lastRotation, this.data.rotationThreshold)) {
      // update the last rotation
      this.lastRotation = newRotation;
      shouldEmit = true;
    }

    if (shouldEmit) {
      // emit a moved event to the server with the new position
      socket.emit('moved', {
        newPosition:
        {x: newPosition.x, y: newPosition.y, z: newPosition.z},
        newRotation:
        {x: newRotation.x, y: newRotation.y, z: newRotation.z,
          w: newRotation.w}});
    }
  }
});

// The PlayerController component
AFRAME.registerComponent('players-controller', {
  init: function () {
    var el = this.el;

    el.addEventListener('updatePlayer', function (data) {
      // get each spawned player
      var spawnedPlayers = document.querySelectorAll('[other-player]');

      // loop through each spawned player
      for (var i = 0; i < spawnedPlayers.length; i++) {
        // check if the current spawned player should be updated (by id)
        if (spawnedPlayers[i].getAttribute('id') ==
          data.detail.player.id)
        {
          // update the position of the player
          spawnedPlayers[i].setAttribute('position',
            data.detail.player.position);

          // update the rotatino of the player
          spawnedPlayers[i].object3D.quaternion.set(
            data.detail.player.rotation.x,
            data.detail.player.rotation.y,
            data.detail.player.rotation.z,
            data.detail.player.rotation.w
          )

          // update the other-player data of the player
          spawnedPlayers[i].setAttribute('other-player', {
            name: data.detail.player.name
          });
        }
      }
    });

    el.addEventListener('addPlayer', function (data) {
      // create a new entity element
      playerEl = document.createElement('a-entity');

      // setup the attributes of the new player element
      playerEl.setAttribute('other-player', {
        name: data.detail.player.name,
        team: data.detail.player.team
      });
      playerEl.setAttribute('id', data.detail.player.id);
      playerEl.setAttribute('position', data.detail.player.position);

      playerEl.object3D.quaternion.set(
        data.detail.player.rotation.x,
        data.detail.player.rotation.y,
        data.detail.player.rotation.z,
        data.detail.player.rotation.w
      )

      console.log('Player ' + data.detail.player.id
        + ' (' + data.detail.player.name + ') joined.');

      // append the new player element to the players-controller element
      el.appendChild(playerEl);
    });

    el.addEventListener('removePlayer', function (data) {
      // get each spawned player
      var spawnedPlayers = document.querySelectorAll('[other-player]');

      // loop through each spawned player
      for (let i = 0; i < spawnedPlayers.length; i++) {
        // check if the current spawned player should be removed (by id)
        if (spawnedPlayers[i].getAttribute('id') ==
          data.detail.player.id)
        {
          console.log('Player ' + spawnedPlayers[i].getAttribute('id')
            + ' (' + data.detail.player.name + ') quit.');

          // remove the spawned player
          spawnedPlayers[i].parentNode.removeChild(spawnedPlayers[i]);
        }
      }
    });
  }
});

// the OtherPlayer component
AFRAME.registerComponent('other-player', {
  schema: {
    name: {type: 'string'},
    team: {type: 'string'}
  },
  init: function () {
    // create the geometry
    var geometry = document.createElement('a-cone');
    geometry.setAttribute('radius-bottom', '0.7');
    geometry.setAttribute('radius-top', '0.1');
    geometry.setAttribute('height', '1.5');

    // set the colour of this player according to their team
    geometry.setAttribute('color', this.data.team);

    this.el.appendChild(geometry);

    this.el.setAttribute('trail', {color: this.data.team});
    // this.el.setAttribute('geometry', {
    //   primitive: 'cone',
    //   radiusBottom: 0.7,
    //   radiusTop: 0.1,
    //   height: 1.5
    // });
    this.el.setAttribute('rotation', {
      x: -90,
      y: 0,
      z: 0
    })
    this.el.setAttribute('material', {
      color: this.data.color
    });
  }
});

// used to modify the material of a model/mesh
AFRAME.registerComponent('modify-material', {
  schema: {
    color: {type: 'color', default: '#fff'}
  },
  init: function () {
    this.el.addEventListener('model-loaded', () => {
      // get the mesh
      const obj = this.el.getObject3D('mesh');

      // change the material color
      obj.traverse(node => {
        console.log(this.data.color);
        node.material.color.set(this.data.color);
      });
    });
  }
});

AFRAME.registerComponent('trail', {
  schema: {
    moveMin: {type: 'number', default: 0.2},
    color: {type: 'color', default: 'green'}
  },
  init: function () {
    // set the trail parent
    this.trailParent = document.querySelector('#trail-particles');

    // set the last position as the target's current position
    this.lastPosition = getPosition(this.el);
  },

  tick: function (time) {
    // check if this element has moved enough
    if (hasMovedAmount(this.el, this.lastPosition, this.data.moveMin)) {
      // update the last position
      this.lastPosition = getPosition(this.el);

      // spawn a trailParticle
      var newParticleEl = document.createElement('a-entity');
      newParticleEl.setAttribute('trail-particle', {
        position: getPosition(this.el),
        startColor: this.data.color
      });
      this.trailParent.appendChild(newParticleEl);
    }
  }
});

AFRAME.registerComponent('trail-particle', {
  schema: {
    position: {type: 'vec3'},
    scale: {type: 'number', default: 0.4},
    lifespan: {type: 'number', default: 3000},
    startColor: {type: 'color', default: 'green'},
    endColor: {type: 'color', default: 'white'}
  },

  init: function () {
    // set birthtime to -1 so that the first tick changes it
    this.birthTime = -1;

    // move the particle to the target's position
    this.el.setAttribute('position', {
      x: this.data.position.x,
      y: this.data.position.y,
      z: this.data.position.z
    });

    // create the mesh and material
    this.el.setAttribute('geometry', {
      primitive: 'sphere',
      radius: this.data.scale
    });

    this.el.setAttribute('material', {
      shader: "flat",
      opacity: 0.8,
      transparent: true,
      color: this.data.startColor
    });
  },

  tick: function (time) {
    // if this is the first tick, set birthtime
    if (this.birthTime == -1) {
      this.birthTime = time;
    }

    // calculate how long the particle has been alive and time remaining
    var timeAlive = time - this.birthTime;
    var timeLeft  = this.data.lifespan - timeAlive;

    // check if the particle has exceeded it's lifespan
    if (timeLeft <= 0) {
      // console.log("Particle expired!");

      // destroy this entity
      this.el.parentNode.removeChild(this.el);

    } else {
      // calculate the life val (percentage of time left)
      var lifeVal = lerp(0, 1, timeLeft / this.data.lifespan);

      // update the element's scale and colour
      this.el.object3D.scale.set(lifeVal, lifeVal, lifeVal);
      this.el.setAttribute('material', {
        color: new THREE.Color(this.data.endColor).lerp(
          new THREE.Color(this.data.startColor), lifeVal)
      });
    }
  }
});
