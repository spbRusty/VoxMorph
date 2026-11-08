import type { AudioFrame } from './audio';

const vertexShader = `#version 300 es
in vec2 position;
out vec2 uv;
void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentShader = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform vec2 resolution;
uniform float time;
uniform float level;
uniform float low;
uniform float mid;
uniform float high;
uniform float symmetry;
uniform float complexity;
uniform float eyes;
uniform vec3 colorA;
uniform vec3 colorB;
uniform vec3 colorC;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y);
}
float fbm(vec2 p) {
  float v=0.0, a=0.5;
  for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; }
  return v;
}
float ellipse(vec2 p, vec2 center, vec2 scale) {
  return length((p-center)/scale);
}
void main() {
  vec2 p=(uv-0.5)*vec2(resolution.x/resolution.y,1.0);
  float mirror=mix(p.x,abs(p.x),symmetry);
  vec2 q=vec2(mirror,p.y);
  float t=time*0.32;
  float n=fbm(q*5.0+vec2(t,-t*0.7));
  float angle=atan(q.y,q.x);
  float radial=length(q);
  float lobes=sin(angle*(5.0+complexity*9.0)+n*5.0+t)*0.035*complexity;
  float pulse=level*0.09+low*0.055;
  float bodyRadius=0.255+lobes+pulse+(n-0.5)*0.105*complexity;
  float organic=radial-bodyRadius;
  float edge=1.0-smoothstep(-0.008,0.012,organic);
  float inner=1.0-smoothstep(bodyRadius-0.13,bodyRadius-0.10,radial);
  float vein=sin((q.x*13.0+fbm(q*8.0+t)*2.0)*3.0+q.y*9.0+mid*5.0)*0.5+0.5;
  float detail=smoothstep(0.58,0.9,vein)*inner*0.45;
  vec3 body=mix(colorA,colorB,clamp(n*0.9+low*0.35,0.0,1.0));
  body=mix(body,colorC,detail);
  body*=0.72+0.28*fbm(q*18.0+t);
  float glow=exp(-abs(organic)*28.0)*0.65;
  vec3 col=body*edge+colorB*glow*edge;
  col+=colorA*detail*edge;

  // Глаза — парные тёмные овалы, слегка реагирующие на голос.
  for(int i=0;i<6;i++) {
    float fi=float(i);
    if(fi < eyes) {
      float x=0.035+fi*0.035;
      if(symmetry>0.5 && mod(fi,2.0)==1.0) continue;
      vec2 eyePos=vec2(x,0.035+sin(t+fi)*0.008);
      float e=ellipse(q,eyePos,vec2(0.027+mid*0.009,0.043+level*0.012));
      float eye=1.0-smoothstep(0.82,1.0,e);
      float pupil=1.0-smoothstep(0.24,0.36,ellipse(q,eyePos+vec2(0.0,-0.004),vec2(0.009,0.018)));
      col=mix(col,vec3(0.025,0.018,0.04),eye*edge);
      col=mix(col,vec3(0.92,0.9,1.0),pupil*eye*edge);
    }
  }
  float mouth=1.0-smoothstep(0.012,0.022,ellipse(q,vec2(0.0,-0.095),vec2(0.018+level*0.055,0.006+level*0.025)));
  col=mix(col,vec3(0.035,0.012,0.035),mouth*edge*0.9);

  float halo=exp(-radial*3.2)*0.045;
  col+=colorB*halo;
  outColor=vec4(col,clamp(edge+glow*0.35,0.0,1.0));
}`;

type Palette = { a: [number,number,number]; b: [number,number,number]; c: [number,number,number] };
const palettes: Record<string, Palette> = {
  violet: { a:[0.22,0.12,0.48], b:[0.72,0.25,0.85], c:[0.15,0.82,0.78] },
  acid: { a:[0.12,0.34,0.18], b:[0.68,0.92,0.12], c:[0.95,0.42,0.12] },
  ember: { a:[0.38,0.07,0.09], b:[0.95,0.28,0.12], c:[1.0,0.72,0.25] },
  ice: { a:[0.08,0.24,0.42], b:[0.25,0.72,0.9], c:[0.72,0.95,1.0] },
  mono: { a:[0.16,0.17,0.22], b:[0.72,0.76,0.82], c:[0.98,0.98,1.0] },
};

export class Creature {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private start = performance.now();
  private params = { symmetry:1, complexity:0.62, eyes:2 };
  private palette = palettes.violet;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { alpha:true, antialias:false, powerPreference:'low-power' });
    if (!gl) throw new Error('Для VoxMorph нужен браузер с поддержкой WebGL 2.');
    this.gl = gl;
    this.program = this.createProgram(vertexShader, fragmentShader);
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const name of ['resolution','time','level','low','mid','high','symmetry','complexity','eyes','colorA','colorB','colorC']) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
  }

  private createProgram(vs: string, fs: string): WebGLProgram {
    const gl=this.gl;
    const compile=(type:number,source:string) => {
      const shader=gl.createShader(type)!; gl.shaderSource(shader,source); gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Ошибка GLSL');
      return shader;
    };
    const program=gl.createProgram()!;
    gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Ошибка WebGL');
    return program;
  }

  resize(width:number,height:number) { this.gl.viewport(0,0,width,height); }
  setParameter(name:'symmetry'|'complexity'|'eyes'|'sensitivity',value:number) {
    if(name==='symmetry') this.params.symmetry=value;
    if(name==='complexity') this.params.complexity=value;
    if(name==='eyes') this.params.eyes=Math.round(value);
  }
  setPalette(name:string) { this.palette=palettes[name] || palettes.violet; }
  randomize() {
    this.params.symmetry=Math.random()>0.25?1:Math.random()*0.6;
    this.params.complexity=0.25+Math.random()*0.75;
    this.params.eyes=Math.floor(Math.random()*7);
    this.palette=Object.values(palettes)[Math.floor(Math.random()*5)];
  }

  render(audio:AudioFrame) {
    const gl=this.gl, u=this.uniforms, p=this.palette;
    gl.useProgram(this.program);
    gl.uniform2f(u.resolution,this.canvas.width,this.canvas.height);
    gl.uniform1f(u.time,(performance.now()-this.start)/1000);
    gl.uniform1f(u.level,audio.level);
    gl.uniform1f(u.low,audio.low);
    gl.uniform1f(u.mid,audio.mid);
    gl.uniform1f(u.high,audio.high);
    gl.uniform1f(u.symmetry,this.params.symmetry);
    gl.uniform1f(u.complexity,this.params.complexity);
    gl.uniform1f(u.eyes,this.params.eyes);
    gl.uniform3fv(u.colorA,p.a);
    gl.uniform3fv(u.colorB,p.b);
    gl.uniform3fv(u.colorC,p.c);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
}
