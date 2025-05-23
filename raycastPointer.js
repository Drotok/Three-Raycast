// Importieren der benötigten Module
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Mögliche Texture Wrapping-Arten
const WRAPPING = {
  'RepeatWrapping': THREE.RepeatWrapping,
  'ClampToEdgeWrapping': THREE.ClampToEdgeWrapping,
  'MirroredRepeatWrapping': THREE.MirroredRepeatWrapping
};

// Initiale Parameter für die GUI
const params = {
  wrapS: THREE.RepeatWrapping,
  wrapT: THREE.RepeatWrapping,
  offsetX: 0,
  offsetY: 0,
  repeatX: 1,
  repeatY: 1,
  rotation: 0,
};

// Konstruktor-Funktion für Canvas-Textur (zeichnet auf HTML-Canvas)
function CanvasTexture(parentTexture) {
  this._canvas = document.createElement('canvas');
  this._canvas.width = this._canvas.height = 1024;
  this._context2D = this._canvas.getContext('2d');

  this._parentTexture = [];

  if (parentTexture) {
    this._parentTexture.push(parentTexture);
    parentTexture.image = this._canvas;
  }

  const that = this;

  // Hintergrundbild für die Canvas-Textur (lädt das UV-Gitter)
  this._background = document.createElement('img');
  this._background.crossOrigin = '';
  this._background.src = 'textures/uv_grid_opengl.jpg';

  this._background.addEventListener('load', function() {
    that._canvas.width = that._background.naturalWidth;
    that._canvas.height = that._background.naturalHeight;

    // Größe des gelben Kreuzes basierend auf Canvas-Abmessungen berechnen
    that._crossRadius = Math.ceil(Math.min(that._canvas.width, that._canvas.height / 30));
    that._crossMax = Math.ceil(0.7071 * that._crossRadius);
    that._crossMin = Math.ceil(that._crossMax / 10);
    that._crossThickness = Math.ceil(that._crossMax / 10);

    that._draw();
  });

  this._draw();
}

// Methoden der CanvasTexture-Klasse definieren
CanvasTexture.prototype = {
  constructor: CanvasTexture,

  _canvas: null,
  _context2D: null,
  _xCross: 0,
  _yCross: 0,

  _crossRadius: 57,
  _crossMax: 40,
  _crossMin: 4,
  _crossThickness: 4,

  _parentTexture: [],

  // Fügt eine neue Eltern-Textur hinzu, die dasselbe Canvas verwendet
  addParent: function(parentTexture) {
    if (!this._parentTexture.includes(parentTexture)) {
      this._parentTexture.push(parentTexture);
      parentTexture.image = this._canvas;
    }
  },

  // Position des gelben Kreuzes setzen (als UV-Koordinaten 0-1)
  setCrossPosition: function(x, y) {
    this._xCross = x * this._canvas.width;
    this._yCross = y * this._canvas.height;
    this._draw();
  },

  // Zeichnet den Hintergrund und das Kreuz neu
  _draw: function() {
    if (!this._context2D) return;

    // Canvas löschen
    this._context2D.clearRect(0, 0, this._canvas.width, this._canvas.height);

    // Hintergrund zeichnen
    this._context2D.drawImage(this._background, 0, 0);

    // Gelbes Kreuz zeichnen
    this._context2D.lineWidth = this._crossThickness * 3;
    this._context2D.strokeStyle = '#FFFF00';

    this._context2D.beginPath();
    this._context2D.moveTo(this._xCross - this._crossMax - 2, this._yCross - this._crossMax - 2);
    this._context2D.lineTo(this._xCross - this._crossMin, this._yCross - this._crossMin);
    this._context2D.moveTo(this._xCross + this._crossMin, this._yCross + this._crossMin);
    this._context2D.lineTo(this._xCross + this._crossMax + 2, this._yCross + this._crossMax + 2);
    this._context2D.moveTo(this._xCross - this._crossMax - 2, this._yCross + this._crossMax + 2);
    this._context2D.lineTo(this._xCross - this._crossMin, this._yCross + this._crossMin);
    this._context2D.moveTo(this._xCross + this._crossMin, this._yCross - this._crossMin);
    this._context2D.lineTo(this._xCross + this._crossMax + 2, this._yCross - this._crossMax - 2);
    this._context2D.stroke();

    // Aktualisiert alle Eltern-Texturen
    this._parentTexture.forEach(tex => tex.needsUpdate = true);
  }
};

// Szene und Renderer initialisieren
let camera, scene, renderer;
let planeTexture, cubeTexture, circleTexture;
let canvas;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const onClickPosition = new THREE.Vector2();

init();

// Initialisierungsfunktion
function init() {
  const container = document.getElementById('container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);

  // Kamera setzen
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(-30, 40, 50);
  camera.lookAt(scene.position);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  // Zentrale Canvas-Textur für alle Objekte erstellen
  cubeTexture = new THREE.Texture(undefined, THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping);
  cubeTexture.colorSpace = THREE.SRGBColorSpace;
  canvas = new CanvasTexture(cubeTexture);

  const cube = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ map: cubeTexture }));
  cube.position.set(4, -5, 0);
  scene.add(cube);

  // Fläche links hinzufügen
  planeTexture = new THREE.Texture(undefined, THREE.UVMapping, THREE.MirroredRepeatWrapping, THREE.MirroredRepeatWrapping);
  planeTexture.colorSpace = THREE.SRGBColorSpace;
  canvas.addParent(planeTexture);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(25, 25), new THREE.MeshBasicMaterial({ map: planeTexture }));
  plane.position.set(-16, -5, 0);
  scene.add(plane);

  // Kreis rechts hinzufügen
  circleTexture = new THREE.Texture(undefined, THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping);
  circleTexture.colorSpace = THREE.SRGBColorSpace;
  canvas.addParent(circleTexture);
  const circle = new THREE.Mesh(new THREE.CircleGeometry(25, 40), new THREE.MeshBasicMaterial({ map: circleTexture }));
  circle.position.set(24, -5, 0);
  scene.add(circle);

  // Ereignisse registrieren
  window.addEventListener('resize', onWindowResize);
  container.addEventListener('mousemove', onMouseMove);

  // GUI zur Anpassung der Textur-Parameter hinzufügen
  const gui = new GUI();
  gui.title('Circle Texture Settings');
  gui.add(params, 'wrapS', WRAPPING).onChange(setwrapS);
  gui.add(params, 'wrapT', WRAPPING).onChange(setwrapT);
  gui.add(params, 'offsetX', 0, 5);
  gui.add(params, 'offsetY', 0, 5);
  gui.add(params, 'repeatX', 0, 5);
  gui.add(params, 'repeatY', 0, 5);
  gui.add(params, 'rotation', 0, 2 * Math.PI);
}

// Animation aktualisiert die Textur-Parameter
function animate() {
  circleTexture.offset.set(params.offsetX, params.offsetY);
  circleTexture.repeat.set(params.repeatX, params.repeatY);
  circleTexture.rotation = params.rotation;
  renderer.render(scene, camera);
}
