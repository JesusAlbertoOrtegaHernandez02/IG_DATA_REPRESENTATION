import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as dat from "dat.gui";

let scene, camera, renderer, controls;
let tierra, nubes;

let loaderGLB = new GLTFLoader();
let modeloAvionCorto = null;
let modeloAvionLargo = null;
let modeloBandera = null;

let rutasAnimadas = [];
let marcadores = [];
let rutasCSV = [];
let indiceRutaActual = 0;

let rutaActual = "src/ruta_mes_cero.csv";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const mouseScreen = new THREE.Vector2();
let tooltipDiv = null;

let gui;
const opciones = {
  dataset: "Mes 0",
};
const rutasMap = {
  "Mes 0": "src/ruta_mes_cero.csv",
  "Mes 1": "src/ruta_mes_uno.csv",
};

init();
animate();

async function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 8, 25);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);

  const luzSol = new THREE.PointLight(0xffeeaa, 2.5, 600);
  luzSol.position.set(20, 0, 20);
  scene.add(luzSol);

  const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(luzAmbiente);

  crearFondoEstrellas();
  crearTierra();
  crearNubes();

  crearTooltip();
  window.addEventListener("mousemove", onMouseMove);

  gui = new dat.GUI();
  gui
    .add(opciones, "dataset", ["Mes 0", "Mes 1"])
    .name("Dataset")
    .onChange((value) => {
      const nuevaRuta = rutasMap[value];
      cambiarDataset(nuevaRuta);
    });

  await cargarModelosAvion();
  await cargarTodasLasRutas();
  cargarPrimerasRutas();

  window.addEventListener("resize", onWindowResize);
}

function crearFondoEstrellas() {
  const loader = new THREE.TextureLoader();
  const tex = loader.load("src/textures/2k_stars.jpg");

  const geo = new THREE.SphereGeometry(300, 64, 64);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
  });

  const sky = new THREE.Mesh(geo, mat);
  scene.add(sky);
}

function crearTierra() {
  const tex = new THREE.TextureLoader().load(
    "src/textures/2k_earth_nightmap.jpg"
  );
  const geo = new THREE.SphereGeometry(5, 64, 64);
  const mat = new THREE.MeshPhongMaterial({ map: tex });
  tierra = new THREE.Mesh(geo, mat);
  scene.add(tierra);
}

function crearNubes() {
  const loader = new THREE.TextureLoader();
  const texCloud = loader.load("src/textures/earthcloudmap.jpg");
  const texAlpha = loader.load("src/textures/earthcloudmaptrans_invert.jpg");

  const geo = new THREE.SphereGeometry(5.06, 64, 64);
  const mat = new THREE.MeshPhongMaterial({
    map: texCloud,
    alphaMap: texAlpha,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  nubes = new THREE.Mesh(geo, mat);
  scene.add(nubes);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function crearTooltip() {
  tooltipDiv = document.createElement("div");
  tooltipDiv.style.position = "fixed";
  tooltipDiv.style.padding = "4px 8px";
  tooltipDiv.style.borderRadius = "4px";
  tooltipDiv.style.background = "rgba(0,0,0,0.7)";
  tooltipDiv.style.color = "#fff";
  tooltipDiv.style.fontSize = "12px";
  tooltipDiv.style.pointerEvents = "none";
  tooltipDiv.style.display = "none";
  document.body.appendChild(tooltipDiv);
}

function onMouseMove(event) {
  mouseScreen.set(event.clientX, event.clientY);
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

async function cargarCSV(ruta) {
  const resp = await fetch(ruta);
  const contenido = await resp.text();
  const lineas = contenido.trim().split("\n");

  const rutas = [];
  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(",").map((c) => c.trim());
    rutas.push({
      origin: {
        iata: cols[0],
        lat: parseFloat(cols[1]),
        lon: parseFloat(cols[2]),
      },
      dest: {
        iata: cols[3],
        lat: parseFloat(cols[4]),
        lon: parseFloat(cols[5]),
      },
    });
  }
  return rutas;
}

async function cargarTodasLasRutas() {
  rutasCSV = await cargarCSV(rutaActual);
  indiceRutaActual = 0;
}

async function cambiarDataset(nuevaRuta) {
  rutaActual = nuevaRuta;
  rutasCSV = await cargarCSV(rutaActual);
  indiceRutaActual = 0;

  rutasAnimadas.forEach((r) => {
    tierra.remove(r.avion);
    tierra.remove(r.linea);
  });

  marcadores.forEach((m) => tierra.remove(m));

  rutasAnimadas = [];
  marcadores = [];

  cargarPrimerasRutas();
}

function latLonToVector3(lat, lon, radius) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function cargarModelosAvion() {
  return new Promise((resolve) => {
    let c = 0;
    const ready = () => {
      if (++c === 3) resolve();
    };

    loaderGLB.load("src/models/Airplane.glb", (gltf) => {
      modeloAvionLargo = gltf.scene;
      modeloAvionLargo.scale.set(0.01, 0.01, 0.01);
      modeloAvionLargo.rotation.x = Math.PI / 2;
      modeloAvionLargo.rotation.z = Math.PI;
      ready();
    });

    loaderGLB.load("src/models/ruta_pequeña.glb", (gltf) => {
      modeloAvionCorto = gltf.scene;
      modeloAvionCorto.scale.set(0.02, 0.02, 0.02);
      modeloAvionCorto.rotation.x = Math.PI / 2;
      modeloAvionCorto.rotation.z = Math.PI;
      ready();
    });

    loaderGLB.load("src/models/Flag.glb", (gltf) => {
      modeloBandera = gltf.scene;
      modeloBandera.scale.set(0.25, 0.25, 0.25);
      modeloBandera.rotation.x = Math.PI / 2;
      ready();
    });
  });
}

function elegirModeloAvion(origen, destino) {
  const lat1 = THREE.MathUtils.degToRad(origen.lat);
  const lat2 = THREE.MathUtils.degToRad(destino.lat);
  const lon1 = THREE.MathUtils.degToRad(origen.lon);
  const lon2 = THREE.MathUtils.degToRad(destino.lon);

  const angular = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2)
  );

  return angular > 0.35 ? modeloAvionLargo : modeloAvionCorto;
}

function crearRuta3D(origen, destino) {
  const radio = 5.1;

  const p1 = latLonToVector3(origen.lat, origen.lon, radio);
  const p2 = latLonToVector3(destino.lat, destino.lon, radio);

  const dist = p1.distanceTo(p2);
  const elev = THREE.MathUtils.mapLinear(dist, 0, 10, 0.5, 2.5);

  let mid = p1
    .clone()
    .add(p2)
    .multiplyScalar(0.5)
    .normalize()
    .multiplyScalar(radio + elev);

  let extraElev = 0;
  let desviacion = new THREE.Vector3(0, 0, 0);

  rutasAnimadas.forEach((r) => {
    const d1 = r.puntos[0].distanceTo(p1);
    const d2 = r.puntos[r.puntos.length - 1].distanceTo(p2);
    const midDist = r.puntos[100].distanceTo(mid);

    if (d1 < 1 || d2 < 1) extraElev += 0.6;

    if (midDist < 0.5) {
      desviacion = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.8
      );
    }
  });

  mid.add(desviacion);
  mid.multiplyScalar(1 + extraElev * 0.15);

  const curva = new THREE.CatmullRomCurve3([p1, mid, p2]);
  const puntos = curva.getPoints(200);

  const geo = new THREE.BufferGeometry().setFromPoints(puntos);
  const mat = new THREE.LineDashedMaterial({
    color: 0xffffff,
    dashSize: 0.15,
    gapSize: 0.08,
  });
  const linea = new THREE.Line(geo, mat);
  linea.computeLineDistances();
  tierra.add(linea);

  const base = elegirModeloAvion(origen, destino);
  const avion = base.clone();
  avion.position.copy(p1);
  avion.lookAt(p2);

  tierra.add(avion);

  rutasAnimadas.push({ origen, destino, puntos, avion, linea, progreso: 0 });
  colocarBandera(p2, `${origen.iata} → ${destino.iata}`);
}

function colocarBandera(pos, texto) {
  const bandera = modeloBandera.clone();
  bandera.position.copy(pos);

  const normal = pos.clone().normalize();
  bandera.lookAt(pos.clone().add(normal));
  bandera.position.add(normal.multiplyScalar(0.2));
  bandera.position.y += 0.1;

  bandera.userData.label = texto;
  marcadores.push(bandera);
  tierra.add(bandera);
}

function cargarPrimerasRutas() {
  for (let i = 0; i < 10 && indiceRutaActual < rutasCSV.length; i++) {
    const r = rutasCSV[indiceRutaActual++];
    crearRuta3D(r.origin, r.dest);
  }
}

function recargarSiLlegan() {
  let terminados = 0;

  rutasAnimadas.forEach((r) => {
    if (r.progreso >= 1) terminados++;
  });

  if (terminados === rutasAnimadas.length && rutasAnimadas.length > 0) {
    rutasAnimadas.forEach((r) => {
      tierra.remove(r.avion);
      tierra.remove(r.linea);
    });

    marcadores.forEach((m) => tierra.remove(m));
    marcadores = [];

    rutasAnimadas = [];

    cargarPrimerasRutas();
  }
}

function animate() {
  requestAnimationFrame(animate);

  tierra.rotation.y += 0.001;
  if (nubes) nubes.rotation.y += 0.0013;

  rutasAnimadas.forEach((r) => {
    r.progreso += 0.002;
    if (r.progreso > 1) r.progreso = 1;

    const total = r.puntos.length;
    const idx = r.progreso * (total - 1);

    const i = Math.floor(idx);
    const t = idx - i;

    const pA = r.puntos[i];
    const pB = r.puntos[Math.min(i + 1, total - 1)];

    const pos = pA.clone().lerp(pB, t);

    r.avion.position.copy(pos);
  });

  recargarSiLlegan();

  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObjects(marcadores, true);

  if (hit.length > 0) {
    let o = hit[0].object;
    while (o && !o.userData.label && o.parent) o = o.parent;

    if (o.userData.label) {
      tooltipDiv.textContent = o.userData.label;
      tooltipDiv.style.left = mouseScreen.x + 12 + "px";
      tooltipDiv.style.top = mouseScreen.y + 12 + "px";
      tooltipDiv.style.display = "block";
    } else tooltipDiv.style.display = "none";
  } else tooltipDiv.style.display = "none";

  controls.update();
  renderer.render(scene, camera);
}
