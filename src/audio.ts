export interface AudioFrame {
  level: number;
  low: number;
  mid: number;
  high: number;
}

export class Microphone {
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private source?: MediaStreamAudioSourceNode;
  private stream?: MediaStream;
  private data = new Uint8Array(1024);
  private smooth: AudioFrame = { level: 0, low: 0, mid: 0, high: 0 };

  async start(deviceId?: string): Promise<void> {
    this.stop();
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
    this.analyser.smoothingTimeConstant = 0.78;
    this.source = this.context.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
  }

  read(): AudioFrame {
    if (!this.analyser) return this.smooth;
    this.analyser.getByteFrequencyData(this.data);
    const band = (from: number, to: number) => {
      let sum = 0;
      for (let i = from; i < to; i++) sum += this.data[i] / 255;
      return sum / Math.max(1, to - from);
    };
    const target = {
      low: Math.min(1, band(1, 12) * 2.8),
      mid: Math.min(1, band(12, 90) * 2.4),
      high: Math.min(1, band(90, 340) * 3.2),
      level: 0,
    };
    let energy = 0;
    for (let i = 0; i < this.data.length; i++) energy += (this.data[i] / 255) ** 2;
    target.level = Math.min(1, Math.sqrt(energy / this.data.length) * 4.5);
    const k = 0.28;
    this.smooth = {
      level: this.smooth.level + (target.level - this.smooth.level) * k,
      low: this.smooth.low + (target.low - this.smooth.low) * k,
      mid: this.smooth.mid + (target.mid - this.smooth.mid) * k,
      high: this.smooth.high + (target.high - this.smooth.high) * k,
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
  }
}
