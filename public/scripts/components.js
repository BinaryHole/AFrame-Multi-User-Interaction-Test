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

    // update the bullet team
    AFRAME.utils.entity.setComponentProperty(
      this.ship, 'shooter.team', this.data.team);

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

          // update the rotation of the player
          spawnedPlayers[i].object3D.quaternion.set(
            data.detail.player.rotation.x,
            data.detail.player.rotation.y,
            data.detail.player.rotation.z,
            data.detail.player.rotation.w
          )

          // console.log(spawnedPlayers[i].object3D.quaternion);
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

      console.log(data.detail.player.name + ' (' + data.detail.player.id
        + ') joined.');

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
          console.log(data.detail.player.name + ' (' + data.detail.player.id
            + ') quit.');

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

    // create the name
    var nameText = document.createElement('a-entity');
    nameText.setAttribute('position', '0 0 1.5');
    nameText.setAttribute('rotation', '-90 180 0')
    nameText.setAttribute('text', {
      value: this.data.name,
      align: 'center',
      width: 20
    });
    var nameText2 = document.createElement('a-entity');
    nameText2.setAttribute('position', '0 0 1.5');
    nameText2.setAttribute('rotation', '90 0 0')
    nameText2.setAttribute('text', {
      value: this.data.name,
      align: 'center',
      width: 20
    });

    this.el.appendChild(nameText);
    this.el.appendChild(nameText2);

    this.el.setAttribute('trail', {
      color: this.data.team
    });
    this.el.setAttribute('rotation', {
      x: -90,
      y: 0,
      z: 0
    });
    this.el.setAttribute('material', {
      color: this.data.color
    });
  }
});

// the shooter component
AFRAME.registerComponent('shooter', {
  schema: {
    directionTarget: {type: 'string'},
    shotDelay: {default: 800},
    speed: {default: 1},
    shooterId: {default: 0},
    shotLifespan: {default: 2000},
    team: {type: 'color'}
  },

  init: function () {
    // set up the last shot time
    this.lastShotTime = 0;
  },

  tick: function (time) {
    // if the mouse is being pressed
    if (_mouseDown && (time - this.lastShotTime) >= this.data.shotDelay) {
      console.log('Shot fired!');

      // get the direction target
      var directionTarget = document.querySelector(this.data.directionTarget);

      // get the direction of the shot
      var shotDirection = new THREE.Euler().setFromQuaternion(
          getRotation(this.el)).toVector3();

      // create a new shot
      socket.emit('shoot', {
        shooterId: this.data.shooterId,
        position: getPosition(this.el),
        direction: shotDirection,
        speed: this.data.speed,
        team: this.data.team,
        // birthTime: time,
        lifespan: this.data.shotLifespan
      });

      // update lastShotTime
      this.lastShotTime = time;
    }
  }
});

AFRAME.registerComponent('bullet', {
  schema: {
    startPos: {type: 'vec3'},
    direction: {type: 'vec3'},
    lifespan: {default: 2000},
    speed: {default: 1},
    scale: {default: 0.25},
    team: {default: 'green'},
    hitRadius: {default: 1.3}
  },

  init: function () {
    this.birthTime = document.querySelector('a-scene').time;

    // set the bullet parent
    this.bulletParent = document.querySelector('#bullets');

    // create the mesh and material
    this.el.setAttribute('geometry', {
      primitive: 'sphere',
      radius: this.data.scale
    });

    this.el.setAttribute('material', {
      color: this.data.team
    });

    // move the bullet to it's starting position
    this.el.setAttribute('position', {
      x: this.data.startPos.x,
      y: this.data.startPos.y,
      z: this.data.startPos.z
    });

    // add the trail component to the bullet
    this.el.setAttribute('trail', {
      color: this.data.team,
      scale: 0.1,
      moveMin: 0.6,
      lifespan: 500
    });
  },

  tick: function (time) {
    // calculate how long the bullet has been alive and time remaining
    var timeAlive = time - this.birthTime;
    var timeLeft  = this.data.lifespan - timeAlive;

    // console.log(`birthTime: ${this.birthTime}\ntimeAlive: ${timeAlive}\ntimeLeft: ${timeLeft}`);

    // check if the bullet has expired
    if (timeLeft <= 0) {
      // destroy the bullet
      this.el.parentNode.removeChild(this.el);
    } else {
      // check if the bullet has hit the player
      // get the position of the player
      var player = document.querySelector('[player]');
      var playerPos = getPosition(player);
      var bulletPos = getPosition(this.el);
      if (playerPos.distanceTo(bulletPos) <= this.data.hitRadius) {
        // get the player's team
        var playerTeam = AFRAME.utils.entity
          .getComponentProperty(player, 'player.team');

        // check if the bullet is from a different team than the player
        if (this.data.team != playerTeam) {
          // give a point to the bullet's team
          socket.emit('getPoint', {team: this.data.team});

          // destroy the bullet
          this.el.parentNode.removeChild(this.el);
        }
      }

      // get the start pos as a THREE.Vector3
      var startPos = new THREE.Vector3().set(
        this.data.startPos.x,
        this.data.startPos.y,
        this.data.startPos.z
      );

      // get the direction as a THREE Vector3
      var direction = new THREE.Euler(
        this.data.direction.x,
        this.data.direction.y,
        this.data.direction.z
      );
      directionVec = new THREE.Vector3(0,1,0);
      directionVec.applyEuler(direction);

      // set the bullet's position according to it's lifespan
      var newPos = startPos.add(directionVec
        .multiplyScalar(this.data.speed * (timeAlive/1000)));

      this.el.setAttribute('position', {
        x: newPos.x,
        y: newPos.y,
        z: newPos.z
      })
    }
  }
});

AFRAME.registerComponent('trail', {
  schema: {
    moveMin: {type: 'number', default: 0.2},
    color: {type: 'color', default: 'green'},
    scale: {default: 0.4},
    lifespan: {default: 3000},
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
        startColor: this.data.color,
        scale: this.data.scale,
        lifespan: this.data.lifespan
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
