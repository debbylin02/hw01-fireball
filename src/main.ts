import {vec2, vec3, vec4, mat4} from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Cube from './geometry/Cube'; 

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.

const controls = {
tesselations: 5,
'Load Scene': loadScene, // A function pointer, essentially

// Update the existing GUI w/ a parameter to alter the color passed to u_Color
// color: [0, 255, 0, 1],
// orange: 163, 33, 7
// yellow: 219, 213, 92
'Top color' : [88, 74, 215, 1],
'Bottom color' : [143, 42, 45, 1],
'Reset Fireball' : resetFireball,
flameSize : 1.0
};

// // true if clicked reset fireball 
// let hasReset: boolean = false; 

let icosphere: Icosphere;
let square: Square;
// added cube 
let cube: Cube; 
let prevTesselations: number = 5;

// added for tickCount
let tickCount: GLint = 0;

// gui 
let gui = new DAT.GUI();

function loadScene() {
// icosphere
icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
icosphere.create();
// square 
square = new Square(vec3.fromValues(0, 0, 0));
square.create();
// create cube 
cube = new Cube(vec3.fromValues(0, 0, 0));
cube.create(); 
}

function resetFireball() 
{
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, 2);
  icosphere.create();

  // reset controls 
  controls['Top color'] = [88, 74, 215, 1];
  controls['Bottom color'] = [143, 42, 45, 1];  
  controls.tesselations = 5;
  controls.flameSize = 1.0; 

  gui.updateDisplay();
}
function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui

  gui.add(controls, 'tesselations', 0, 8).step(1);
  gui.add(controls, 'Load Scene');
  gui.add(controls, 'Reset Fireball');
  gui.add(controls, 'flameSize', 1.0, 1.8).step(0.1);

  // adding color picker 
  // gui.addColor(controls, 'color'); 
  gui.addColor(controls, 'Top color'); 
  gui.addColor(controls, 'Bottom color'); 

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');

  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  // renderer.setClearColor(0.2, 0.2, 0.2, 1);
  // set background to black 
  renderer.setClearColor(0., 0., 0., 1);
  gl.enable(gl.DEPTH_TEST);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);

  const custom = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/custom-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/custom-frag.glsl')),
  ]);

  const fireball = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/fireball-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/fireball-frag.glsl')),
  ]);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  const background = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/background-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/background-frag.glsl')),
  ]);
  background.setGeometryColor([0.5, 0.5, 0.5, 1.0]); 

  // This function will be called every frame
  function tick(){
    // increase tickCount 
    tickCount++; 

    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    if(controls.tesselations != prevTesselations)
    {
      prevTesselations = controls.tesselations;
      icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
      icosphere.create();
    }
  
    // update color - pass to renderer/shader 
    // pass tickCount to renderer/shader  
    // const updatedColor = vec4.fromValues(controls.color[0] / 255, controls.color[1] / 255, controls.color[2] / 255, controls.color[3]); 
    const topColor = vec4.fromValues(controls['Top color'][0] / 255, controls['Top color'][1] / 255, controls['Top color'][2] / 255, controls['Top color'][3]); 
    const bottomColor = vec4.fromValues(controls['Bottom color'][0] / 255, controls['Bottom color'][1] / 255, controls['Bottom color'][2] / 255, controls['Bottom color'][3]); 
    const updatedFlameSize = controls.flameSize; 
    renderer.render(camera, background, topColor, bottomColor, tickCount, updatedFlameSize, [
      cube, 
    ]);

    // fireball 
    renderer.render(camera, fireball, topColor, bottomColor, tickCount, updatedFlameSize, [
      icosphere,
    ]);


    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}



main();