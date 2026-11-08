export {};

declare global {
  interface Window {
    voxmorph?: {
      toggleObsMode(): Promise<boolean>;
      moveWindowBy(dx: number, dy: number): void;
      minimize(): void;
      close(): void;
      onObsModeChanged(callback: (enabled: boolean) => void): void;
    };
  }
}
