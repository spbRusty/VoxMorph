export {};

declare global {
  interface Window {
    voxmorph?: {
      toggleObsMode(): Promise<boolean>;
      minimize(): void;
      close(): void;
      onObsModeChanged(callback: (enabled: boolean) => void): void;
    };
  }
}
