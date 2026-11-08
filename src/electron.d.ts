export {};

declare global {
  interface Window {
    voxmorph?: {
      toggleObsMode(): Promise<boolean>;
      resizeWindowTo(width: number, height: number): void;
      minimize(): void;
      close(): void;
      onObsModeChanged(callback: (enabled: boolean) => void): void;
    };
  }
}
