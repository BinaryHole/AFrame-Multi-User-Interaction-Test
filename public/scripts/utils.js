// team enums
var Team = {
  RED: 'red',
  BLUE: 'blue'
}

// used for keeping time synchronized with the server
var _clock = null;

// used for checking if the mouse is pressed or not
var _mouseDown = false;
const mouseDown = () => {
  _mouseDown = true;
}
const mouseUp = () => {
  _mouseDown = false;
}

// updates the score
const updateScore = (redScore, blueScore) => {
  document.querySelector('#redScore').innerHTML=`${redScore}`;
  document.querySelector('#blueScore').innerHTML=`${blueScore}`;
}

// Creates a random hex color
const randomColor = () => {
  return('#' + Math.floor(Math.random() * 16777215).toString(16));
}

// allows for easily getting position as a THREE vector3
const getPosition = (element) => {
  return element.object3D.getWorldPosition(new THREE.Vector3())
    .clone();
}

// allows for easily getting a rotation as a THREE quat
const getRotation = (element) => {
  return element.object3D.getWorldQuaternion(new THREE.Quaternion())
    .clone();
}

// check if an element has moved the desired amount
const hasMovedAmount = (element, lastPosition, amount) => {
  return lastPosition.distanceTo(getPosition(element)) >= amount;
}

// check if an element has rotated the desired amount
const hasRotatedAmount = (element, lastRotation, amount) => {
  return Math.abs(THREE.MathUtils.radToDeg(
    lastRotation.angleTo(getRotation(element)))) >= amount;
}

// for linear interpolation between two values
const lerp = (start, end, amount) => {
  return (1-amount) * start + amount * end;
}
