import {mat4, vec4} from 'gl-matrix';
import Drawable from './Drawable';
import Camera from '../../Camera';
import {gl} from '../../globals';
import ShaderProgram from './ShaderProgram';

// In this file, `gl` is accessible because it is imported above
class OpenGLRenderer {
  constructor(public canvas: HTMLCanvasElement) {
  }

  setClearColor(r: number, g: number, b: number, a: number) {
    gl.clearColor(r, g, b, a);
  }

  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  // added updatedColor and time variable 
  render(camera: Camera, prog: ShaderProgram, updatedColor: vec4, updatedBottomColor: vec4, tickCount: GLint, flameSize: GLfloat, drawables: Array<Drawable>) {
  // render(camera: Camera, prog: ShaderProgram, topColor: vec4, bottomColor: vec4, tickCount: GLint, drawables: Array<Drawable>) {
    let model = mat4.create();
    let viewProj = mat4.create();
    // let color = vec4.fromValues(1, 0, 0, 1);

    // set color and time 
    let color = updatedColor;
    let bottomColor = updatedBottomColor; 
    let time = tickCount;

    mat4.identity(model);
    mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
    prog.setModelMatrix(model);
    prog.setViewProjMatrix(viewProj);
    prog.setGeometryColor(color);

    // bottom color 
    prog.setBottomColor(bottomColor);

    // call set time function 
    prog.setTime(time); 

    // set flame size 
    prog.setFlameSize(flameSize); 

    for (let drawable of drawables) {
      prog.draw(drawable);
    }
  }
};

export default OpenGLRenderer;
