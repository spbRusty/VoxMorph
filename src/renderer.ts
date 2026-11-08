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
uniform float motion;
uniform float flux;
uniform float pitch;
uniform float breath;
uniform float voicing;
uniform float brightness;
uniform float roughness;
uniform float rhythm;
uniform float onset;
uniform float harmonics;
uniform float flatness;
uniform float zeroCrossing;
uniform float symmetry;
uniform float complexity;
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
  // Параметры морфологии сами медленно дрейфуют, голос добавляет небольшие отклонения.
  float dynamicSymmetry=clamp(symmetry + sin(time*0.19)*0.22 + sin(time*0.071+mid*2.0)*0.10 - motion*0.12 - roughness*0.08,0.0,1.0);
  float dynamicComplexity=clamp(complexity + sin(time*0.23+1.7)*0.20 + sin(time*0.093+low*3.0)*0.10 + flux*0.12 + roughness*0.12 + brightness*0.08,0.1,1.0);
  float mirror=mix(p.x,abs(p.x),dynamicSymmetry);
  vec2 q=vec2(mirror,p.y);
  float t=time*0.32;
  // Самостоятельное движение сохраняется даже в тишине.
  float drift=sin(t*1.15+q.y*8.0)*0.012+sin(t*0.73+q.x*11.0)*0.009;
  float n=fbm(q*5.0+vec2(t*0.75,-t*0.55));
  float angle=atan(q.y,q.x);
  float radial=length(q);
  float voiceMotion=low*0.035+mid*0.045+high*0.035+motion*0.09+flux*0.08+onset*0.045+rhythm*0.035;
  float gesture=sin(t*5.2+angle*3.0+mid*8.0+pitch*4.0)*motion*0.035 + sin(t*3.0+angle*2.0)*rhythm*0.018 + onset*0.025;
  float flutter=sin(t*13.0+angle*17.0+high*9.0)*flux*0.012 + sin(t*19.0+angle*23.0)*breath*0.009 + sin(t*8.0+angle*7.0)*roughness*0.012 + sin(t*22.0+angle*29.0)*flatness*0.008 + sin(t*15.0+angle*13.0)*zeroCrossing*0.007;
  // Несколько семейств силуэтов плавно сменяют друг друга: округлые, волнистые и вытянутые.
  float morphA=0.5+0.5*sin(time*0.105+sin(time*0.037)*1.7);
  float morphB=0.5+0.5*sin(time*0.081+2.2+sin(time*0.029)*1.3);
  float silhouetteRound=sin(angle*2.0+t*0.42+n*2.0)*0.035+sin(angle*3.0-t*0.31)*0.022;
  float silhouetteWave=sin(angle*(6.0+dynamicComplexity*3.0)+t*0.7+n*4.0)*0.031+sin(angle*11.0-t*0.5)*0.014;
  float silhouetteFlow=cos(angle*2.0-t*0.35+pitch*2.0)*0.045+sin(angle*4.0+t*0.28+n*3.0)*0.025 + cos(angle*5.0+t*0.8)*breath*0.018;
  float silhouette=mix(mix(silhouetteRound,silhouetteWave,morphA),silhouetteFlow,morphB*0.72);
  float lobes=sin(angle*(5.0+dynamicComplexity*9.0)+n*5.0+t*1.35+low*3.5+mid*2.0)*(0.012+voiceMotion*0.55)*dynamicComplexity;
  float ripple=sin(angle*11.0-t*2.1+high*8.0+flux*5.0)*(high*0.012+flux*0.025);
  float pulse=0.012+level*0.018+low*0.035+gesture;
  float bodyRadius=0.255+silhouette+drift+lobes+ripple+flutter+pulse+(n-0.5)*0.095*dynamicComplexity + sin(angle*3.0+t+pitch*5.0)*pitch*0.018 + (harmonics-0.5)*0.018 + onset*0.025 + (zeroCrossing-0.5)*0.012;
  float organic=radial-bodyRadius;
  float edge=1.0-smoothstep(-0.008,0.012,organic);
  float inner=1.0-smoothstep(bodyRadius-0.13,bodyRadius-0.10,radial);
  float vein=sin((q.x*(13.0+brightness*9.0)+fbm(q*8.0+t)*2.0)*3.0+q.y*9.0+mid*5.0+pitch*7.0)*0.5+0.5;
  float detail=smoothstep(0.58,0.9,vein)*inner*0.45;
  // Автоматический цветовой цикл; голос ускоряет и смещает переливы.
  float colorPhase=t*0.62+low*2.8+mid*2.1+high*1.6+motion*2.4+flux*3.0+pitch*1.8+brightness*1.4+rhythm*1.1;
  float colorWave=0.5+0.5*sin(colorPhase+n*2.2);
  float colorAccent=0.5+0.5*sin(colorPhase*0.73+2.1+high*3.0+motion*4.0+breath*3.0+voicing*2.0);
  vec3 spectral=0.5+0.5*cos(colorPhase+vec3(0.0,2.1,4.2));
  vec3 body=mix(colorA,colorB,clamp(colorWave*0.82+n*0.18,0.0,1.0));
  body=mix(body,colorC,detail*(0.45+colorAccent*0.8));
  body=mix(body,body*vec3(0.72,0.88,1.18),breath*0.22);
  body=mix(body,body*vec3(1.15,0.78,1.08),roughness*0.16);
  body=mix(body,body*(0.55+spectral*0.9)+spectral*0.12,0.28+motion*0.32+flux*0.22);
  body*=0.72+0.28*fbm(q*18.0+t);
  float glow=exp(-abs(organic)*28.0)*(0.55+high*0.45+mid*0.18+voicing*0.18+harmonics*0.12);
  vec3 col=body*edge+colorB*glow*edge;
  col+=colorA*detail*edge;

  // Всегда два отдельных глаза по обе стороны центра; радужки переливаются независимо от громкости.
  float eyeX=0.052+sin(t*1.7+mid*2.0)*0.008+high*0.006+pitch*0.003;
  // Нерегулярное моргание примерно раз в несколько секунд, иногда с коротким повтором.
  float blinkPhase=fract(time*0.115+sin(time*0.31)*0.025);
  float blink=1.0-smoothstep(0.012,0.045,abs(blinkPhase-0.105));
  float doubleBlink=1.0-smoothstep(0.009,0.028,abs(blinkPhase-0.145));
  blink=max(blink,doubleBlink*(0.35+0.65*step(0.35,sin(floor(time*0.115)*12.7))));
  for(int sideIndex=0; sideIndex<2; sideIndex++) {
    float side=sideIndex==0 ? -1.0 : 1.0;
    vec2 eyePos=vec2(side*eyeX,0.035+sin(t*1.25+mid*2.0+float(sideIndex))*0.012);
    float eyeHeight=mix(0.043+level*0.008+low*0.006,0.0045,blink);
    float e=ellipse(p,eyePos,vec2(0.027+mid*0.010,eyeHeight));
    float eye=1.0-smoothstep(0.82,1.0,e);
    float pupil=1.0-smoothstep(0.24,0.36,ellipse(p,eyePos+vec2(0.0,-0.004),vec2(0.009,0.018)));
    vec3 iris=0.5+0.5*cos(colorPhase*1.35+vec3(0.0,2.1,4.2)+vec3(high*3.0,mid*2.0,low*2.5)+float(sideIndex)*1.3+brightness*2.0);
    vec3 eyeBase=mix(vec3(0.025,0.018,0.04),iris,0.78);
    col=mix(col,eyeBase,eye*edge);
    col=mix(col,vec3(0.96,0.96,1.0),pupil*eye*edge);
    float eyeSpark=1.0-smoothstep(0.0,0.012,length(p-(eyePos+vec2(-0.008,0.012))));
    col+=iris*eyeSpark*eye*edge*(1.0-blink)*0.65;
  }
  float mouth=1.0-smoothstep(0.012,0.022,ellipse(q,vec2(0.0,-0.095+sin(t*2.0)*0.004),vec2(0.018+mid*0.045+level*0.025+onset*0.012,0.006+mid*0.018+level*0.012+pitch*0.006)));
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
  private params = { symmetry:1, complexity:0.62 };
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
    for (const name of ['resolution','time','level','low','mid','high','motion','flux','pitch','breath','voicing','brightness','roughness','rhythm','onset','harmonics','flatness','zeroCrossing','symmetry','complexity','colorA','colorB','colorC']) {
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
  setPalette(name:string) { this.palette=palettes[name] || palettes.violet; }
  randomize() {
    this.params.symmetry=Math.random()>0.25?1:Math.random()*0.6;
    this.params.complexity=0.25+Math.random()*0.75;
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
    gl.uniform1f(u.motion,audio.motion);
    gl.uniform1f(u.flux,audio.flux);
    gl.uniform1f(u.pitch,audio.pitch);
    gl.uniform1f(u.breath,audio.breath);
    gl.uniform1f(u.voicing,audio.voicing);
    gl.uniform1f(u.brightness,audio.brightness);
    gl.uniform1f(u.roughness,audio.roughness);
    gl.uniform1f(u.rhythm,audio.rhythm);
    gl.uniform1f(u.onset,audio.onset);
    gl.uniform1f(u.harmonics,audio.harmonics);
    gl.uniform1f(u.flatness,audio.flatness);
    gl.uniform1f(u.zeroCrossing,audio.zeroCrossing);
    gl.uniform1f(u.symmetry,this.params.symmetry);
    gl.uniform1f(u.complexity,this.params.complexity);
    gl.uniform3fv(u.colorA,p.a);
    gl.uniform3fv(u.colorB,p.b);
    gl.uniform3fv(u.colorC,p.c);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
}
