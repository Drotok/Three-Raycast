// Importieren der benötigten Bibliotheken von Three.js
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Deklaration globaler Variablen
let camera, scene, renderer;
let plane; // Unsichtbare Ebene für Raycasting
let pointer, raycaster, isShiftDown = false;

let rollOverMesh, rollOverMaterial; // Transparenter Vorschau-Würfel
let cubeGeo, cubeMaterial; // Würfelgeometrie und Material

const objects = []; // Array zum Speichern interaktiver Objekte

// Initialisierung der Szene
init();
render();

// -------------------------
// Hauptinitialisierung
// -------------------------
function init() {
  // Kameraeinstellungen (Perspektivische Kamera)
  camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 1, 10000
  );
  camera.position.set(500, 800, 1300);
  camera.lookAt(0, 0, 0);

  // Erstellen der Szene mit hellgrauem Hintergrund
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // --- Roll-over Vorschau-Würfel ---
  const rollOverGeo = new THREE.BoxGeometry(50, 50, 50);
  rollOverMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,      // Rot
    opacity: 0.5,         // Halb transparent
    transparent: true,
  });
  rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
  scene.add(rollOverMesh);

  // --- Würfel-Geometrie und Textur ---
  const map = new THREE.TextureLoader().load("textures/square-outline-textured.png");
  map.colorSpace = THREE.SRGBColorSpace;

  cubeGeo = new THREE.BoxGeometry(50, 50, 50);
  cubeMaterial = new THREE.MeshLambertMaterial({
    color: 0xfeb74c,
    map: map
  });

  // --- Hilfsgitter auf dem Boden ---
  const gridHelper = new THREE.GridHelper(1000, 20);
  scene.add(gridHelper);

  // --- Raycaster zur Maus-Positionsbestimmung ---
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  // Unsichtbare Ebene zur Erkennung der Mausposition auf der horizontalen Fläche
  const geometry = new THREE.PlaneGeometry(1000, 1000);
  geometry.rotateX(-Math.PI / 2); // flach auf dem Boden liegend
  plane = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  scene.add(plane);

  objects.push(plane); // Ebene hinzufügen, um Raycasting zu ermöglichen

  // --- Beleuchtung ---
  const ambientLight = new THREE.AmbientLight(0x606060, 3);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(1, 0.75, 0.5).normalize();
  scene.add(directionalLight);

  // --- Renderer-Setup ---
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // --- Event Listener für Interaktionen ---
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("keydown", onDocumentKeyDown);
  document.addEventListener("keyup", onDocumentKeyUp);
  window.addEventListener("resize", onWindowResize);

  // --- OrbitControls zur Kamerasteuerung (Rotation und Zoom) ---
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Sanfte Bewegung
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);
  controls.update();
}

// -------------------------
// Fenstergrößenänderung behandeln
// -------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

// -------------------------
// Vorschau-Würfel-Positionierung bei Mausbewegung
// -------------------------
function onPointerMove(event) {
  // Mauskoordinaten in normalisierte Gerätekoordinaten (NDC) umwandeln (-1 bis +1)
  pointer.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  // Raycaster aktualisieren und Schnittpunkte mit Objekten ermitteln
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(objects, false);

  if (intersects.length > 0) {
    const intersect = intersects[0];

    // Vorschau-Würfel positionieren, ausrichten auf Gitter (50er-Schritte)
    rollOverMesh.position.copy(intersect.point).add(intersect.face.normal);
    rollOverMesh.position
      .divideScalar(50)
      .floor()
      .multiplyScalar(50)
      .addScalar(25); // Verschiebt Würfel ins Gitterzentrum

    render();
  }
}

// -------------------------
// Würfel setzen oder löschen bei Klick
// -------------------------
function onPointerDown(event) {
  pointer.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(objects, false);

  if (intersects.length > 0) {
    const intersect = intersects[0];

    // Shift gedrückt? -> Würfel löschen
    if (isShiftDown) {
      if (intersect.object !== plane) {
        scene.remove(intersect.object);
        objects.splice(objects.indexOf(intersect.object), 1);
      }
    } else { // sonst Würfel hinzufügen
      const voxel = new THREE.Mesh(cubeGeo, cubeMaterial);
      voxel.position.copy(intersect.point).add(intersect.face.normal);
      voxel.position
        .divideScalar(50)
        .floor()
        .multiplyScalar(50)
        .addScalar(25);
      scene.add(voxel);
      objects.push(voxel);
    }
    render();
  }
}

// -------------------------
// Tastendruck-Abfrage (Shift)
// -------------------------
function onDocumentKeyDown(event) {
  if (event.keyCode === 16) { // 16 = Shift
    isShiftDown = true;
  }
}

function onDocumentKeyUp(event) {
  if (event.keyCode === 16) {
    isShiftDown = false;
  }
}

// -------------------------
// Renderfunktion
// -------------------------
function render() {
  renderer.render(scene, camera);
}
