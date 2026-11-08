export interface AudioFrame {
  level: number;
  low: number;
  mid: number;
  high: number;
  motion: number;
  flux: number;
}

export class Microphone {
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private source?: MediaStreamAudioSourceNode;
  private stream?: MediaStream;
  private frequency = new Uint8Array(1024);
  private waveform = new Uint8Array(2048);
  private smooth: AudioFrame = { level: 0, low: 0, mid: 0, high: 0, motion: 0, flux: 0 };
  private previousBands = { level: 0, low: 0, mid: 0, high: 0 };
  private previousFrequency = new Uint8Array(1024);
  private noiseFloor = 0.008;
  private calibratedAt = 0;

  async start(deviceId?: string): Promise<void> {
    this.stop();
    this.noiseFloor = 0.008;
    this.calibratedAt = performance.now();
    this.previousBands = { level: 0, low: 0, mid: 0, high: 0 };
    this.previousFrequency.fill(0);
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    this.context = new AudioContext();
    await this.context.resume();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.68;
    this.source = this.context.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    this.frequency = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveform = new Uint8Array(this.analyser.fftSize);
  }

  read(): AudioFrame {
    if (!this.analyser) return this.smooth;
    this.analyser.getByteFrequencyData(this.frequency);
    this.analyser.getByteTimeDomainData(this.waveform);

    const band = (from: number, to: number) => {
      let sum = 0;
      for (let i = from; i < to; i++) sum += (this.frequency[i] / 255) ** 2;
      return Math.sqrt(sum / Math.max(1, to - from));
    };

    let squareSum = 0;
    for (let i = 0; i < this.waveform.length; i++) {
      const sample = (this.waveform[i] - 128) / 128;
      squareSum += sample * sample;
    }
    const rms = Math.sqrt(squareSum / this.waveform.length);

    // Первые 1.5 секунды — оценка фонового шума. Затем порог медленно
    // подстраивается только в тихих промежутках, не съедая речь.
    const elapsed = performance.now() - this.calibratedAt;
    if (elapsed < 1500 || rms < this.noiseFloor * 2.2) {
      const rate = elapsed < 1500 ? 0.035 : 0.002;
      this.noiseFloor += (rms - this.noiseFloor) * rate;
    }
    const voice = Math.max(0, rms - this.noiseFloor * 1.45);
    const level = Math.min(1, Math.pow(voice * 8.5, 0.78));

    const target = {
      level,
      low: Math.min(1, band(1, 12) * 5.0),
      mid: Math.min(1, band(12, 90) * 5.8),
      high: Math.min(1, band(90, 340) * 7.0),
    };

    // Считаем не только громкость, но и то, насколько звук меняется от кадра к кадру.
    let spectralFlux = 0;
    for (let i = 2; i < this.frequency.length; i++) {
      const now = this.frequency[i] / 255;
      const before = this.previousFrequency[i] / 255;
      spectralFlux += Math.max(0, now - before);
      this.previousFrequency[i] = this.frequency[i];
    }
    spectralFlux = Math.min(1, spectralFlux / 18);
    const variation =
      Math.abs(target.level - this.previousBands.level) * 1.7 +
      Math.abs(target.low - this.previousBands.low) * 0.75 +
      Math.abs(target.mid - this.previousBands.mid) * 1.0 +
      Math.abs(target.high - this.previousBands.high) * 0.8;
    this.previousBands = target;
    const motionTarget = Math.min(1, variation);
    const fluxTarget = Math.min(1, spectralFlux);

    const attack = 0.55;
    const release = 0.12;
    this.smooth = {
      level: this.smooth.level + (target.level - this.smooth.level) * (target.level > this.smooth.level ? attack : release),
      low: this.smooth.low + (target.low - this.smooth.low) * (target.low > this.smooth.low ? 0.38 : 0.18),
      mid: this.smooth.mid + (target.mid - this.smooth.mid) * (target.mid > this.smooth.mid ? 0.44 : 0.16),
      high: this.smooth.high + (target.high - this.smooth.high) * (target.high > this.smooth.high ? 0.5 : 0.14),
      motion: this.smooth.motion + (motionTarget - this.smooth.motion) * (motionTarget > this.smooth.motion ? 0.72 : 0.09),
      flux: this.smooth.flux + (fluxTarget - this.smooth.flux) * (fluxTarget > this.smooth.flux ? 0.68 : 0.08),
    };
    return this.smooth;
  }

  stop(): void {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    void this.context?.close();
    this.context = undefined;
    this.analyser = undefined;
    this.source = undefined;
    this.smooth = { level: 0, low: 0, mid: 0, high: 0, motion: 0, flux: 0 };
    this.previousBands = { level: 0, low: 0, mid: 0, high: 0 };
    this.previousFrequency.fill(0);
  }
}
