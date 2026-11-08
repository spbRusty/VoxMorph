export interface AudioFrame {
  level: number;
  low: number;
  mid: number;
  high: number;
  motion: number;
  flux: number;
  pitch: number;
  breath: number;
  voicing: number;
  brightness: number;
  roughness: number;
  rhythm: number;
  onset: number;
  harmonics: number;
  flatness: number;
  zeroCrossing: number;
}

const zeroFrame = (): AudioFrame => ({
  level:0, low:0, mid:0, high:0, motion:0, flux:0,
  pitch:0, breath:0, voicing:0, brightness:0, roughness:0,
  rhythm:0, onset:0, harmonics:0, flatness:0, zeroCrossing:0,
});

export class Microphone {
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private source?: MediaStreamAudioSourceNode;
  private stream?: MediaStream;
  private frequency = new Uint8Array(1024);
  private waveform = new Uint8Array(2048);
  private smooth: AudioFrame = zeroFrame();
  private previousBands = { level:0, low:0, mid:0, high:0 };
  private previousFrequency = new Uint8Array(1024);
  private noiseFloor = 0.008;
  private calibratedAt = 0;
  private rhythmPulse = 0;
  private lastOnsetAt = 0;

  async start(deviceId?: string): Promise<void> {
    this.stop();
    this.noiseFloor = 0.008;
    this.calibratedAt = performance.now();
    this.previousBands = { level:0, low:0, mid:0, high:0 };
    this.previousFrequency.fill(0);
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact:deviceId } : undefined,
        echoCancellation:false,
        noiseSuppression:false,
        autoGainControl:false,
      },
    });
    this.context = new AudioContext();
    await this.context.resume();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.55;
    this.source = this.context.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    this.frequency = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveform = new Uint8Array(this.analyser.fftSize);
  }

  read(): AudioFrame {
    if (!this.analyser || !this.context) return this.smooth;
    this.analyser.getByteFrequencyData(this.frequency);
    this.analyser.getByteTimeDomainData(this.waveform);

    const band = (from:number,to:number) => {
      let sum=0;
      for(let i=from;i<to;i++) sum+=(this.frequency[i]/255)**2;
      return Math.sqrt(sum/Math.max(1,to-from));
    };

    let squareSum=0, crossings=0;
    let previous=(this.waveform[0]-128)/128;
    for(let i=0;i<this.waveform.length;i++) {
      const sample=(this.waveform[i]-128)/128;
      squareSum+=sample*sample;
      if(i>0 && ((sample>=0 && previous<0)||(sample<0 && previous>=0))) crossings++;
      previous=sample;
    }
    const rms=Math.sqrt(squareSum/this.waveform.length);
    const zeroCrossing=Math.min(1,crossings/this.waveform.length*3.2);

    const elapsed=performance.now()-this.calibratedAt;
    if(elapsed<1500 || rms<this.noiseFloor*2.2) {
      const rate=elapsed<1500?0.035:0.002;
      this.noiseFloor+=(rms-this.noiseFloor)*rate;
    }
    const voice=Math.max(0,rms-this.noiseFloor*1.45);
    const level=Math.min(1,Math.pow(voice*8.5,0.78));

    const low=Math.min(1,band(1,12)*5.0);
    const mid=Math.min(1,band(12,90)*5.8);
    const high=Math.min(1,band(90,340)*7.0);

    let spectralFlux=0, weighted=0, magnitude=0, logSum=0, arithmetic=0, bins=0;
    for(let i=2;i<Math.min(340,this.frequency.length);i++) {
      const value=this.frequency[i]/255;
      const before=this.previousFrequency[i]/255;
      spectralFlux+=Math.max(0,value-before);
      this.previousFrequency[i]=this.frequency[i];
      weighted+=i*value;
      magnitude+=value;
      logSum+=Math.log(Math.max(value,0.0001));
      arithmetic+=value;
      bins++;
    }
    spectralFlux=Math.min(1,spectralFlux/18);
    const brightness=magnitude>0?Math.min(1,(weighted/magnitude)/340):0;
    const flatness=arithmetic>0?Math.min(1,Math.exp(logSum/bins)/(arithmetic/bins)):0;

    // Автокорреляция короткого прореженного фрагмента: высота тона и периодичность голоса.
    const stride=4, sampleCount=480, minLag=10, maxLag=100;
    let bestCorrelation=0, bestLag=0;
    const sampleAt=(index:number)=>(this.waveform[index*stride]-128)/128;
    for(let lag=minLag;lag<=maxLag;lag++) {
      let cross=0, energyA=0, energyB=0;
      for(let i=0;i<sampleCount-lag;i++) {
        const a=sampleAt(i), b=sampleAt(i+lag);
        cross+=a*b; energyA+=a*a; energyB+=b*b;
      }
      const correlation=cross/Math.sqrt(Math.max(1e-9,energyA*energyB));
      if(correlation>bestCorrelation) { bestCorrelation=correlation; bestLag=lag; }
    }
    const harmonics=Math.max(0,Math.min(1,(bestCorrelation-0.12)/0.72));
    const sampleRate=this.context.sampleRate/stride;
    const rawPitch=bestLag>0?sampleRate/bestLag:0;
    const pitch=rawPitch>65&&rawPitch<520?Math.min(1,Math.max(0,(rawPitch-65)/455)):0;
    const voicing=Math.min(1,harmonics*(0.35+level*0.9));
    const breath=Math.min(1,high*(0.35+flatness*0.9)*(1-harmonics*0.8)*2.0);
    const roughness=Math.min(1,flatness*0.48+zeroCrossing*0.24+spectralFlux*0.55);

    const target={level,low,mid,high};
    const variation=
      Math.abs(level-this.previousBands.level)*1.7+
      Math.abs(low-this.previousBands.low)*0.75+
      Math.abs(mid-this.previousBands.mid)+
      Math.abs(high-this.previousBands.high)*0.8;
    this.previousBands=target;
    const motionTarget=Math.min(1,variation);
    const now=performance.now();
    const onsetDetected=spectralFlux>0.105 && now-this.lastOnsetAt>115;
    if(onsetDetected) {
      this.lastOnsetAt=now;
      this.rhythmPulse=Math.min(1,this.rhythmPulse+0.72);
    }
    this.rhythmPulse*=0.94;
    const onset=onsetDetected?Math.min(1,spectralFlux*2.8):0;
    const rhythm=Math.min(1,this.rhythmPulse*(0.55+Math.min(0.45,mid*0.5)));

    const targets:AudioFrame={
      ...target,
      motion:motionTarget,
      flux:spectralFlux,
      pitch,
      breath,
      voicing,
      brightness,
      roughness,
      rhythm,
      onset,
      harmonics,
      flatness,
      zeroCrossing,
    };
    const smooth=(key:keyof AudioFrame,attack=0.4,release=0.14) => {
      const next=targets[key], current=this.smooth[key];
      return current+(next-current)*(next>current?attack:release);
    };
    this.smooth={
      level:smooth('level',0.55,0.12),
      low:smooth('low',0.38,0.18),
      mid:smooth('mid',0.44,0.16),
      high:smooth('high',0.5,0.14),
      motion:smooth('motion',0.72,0.09),
      flux:smooth('flux',0.68,0.08),
      pitch:smooth('pitch',0.35,0.12),
      breath:smooth('breath',0.42,0.12),
      voicing:smooth('voicing',0.48,0.16),
      brightness:smooth('brightness',0.3,0.12),
      roughness:smooth('roughness',0.45,0.14),
      rhythm:smooth('rhythm',0.72,0.08),
      onset:smooth('onset',0.85,0.08),
      harmonics:smooth('harmonics',0.4,0.15),
      flatness:smooth('flatness',0.35,0.12),
      zeroCrossing:smooth('zeroCrossing',0.4,0.14),
    };
    return this.smooth;
  }

  stop():void {
    this.stream?.getTracks().forEach(track=>track.stop());
    this.stream=undefined;
    void this.context?.close();
    this.context=undefined;
    this.analyser=undefined;
    this.source=undefined;
    this.smooth=zeroFrame();
    this.previousBands={level:0,low:0,mid:0,high:0};
    this.previousFrequency.fill(0);
    this.rhythmPulse=0;
    this.lastOnsetAt=0;
  }
}
