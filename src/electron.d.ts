export {};

declare global {
  interface Window {
    voxmorph?: {
      toggleObsMode(): Promise<boolean>;
      beginWindowDrag(screenX: number, screenY: number): void;
      moveWindowDrag(screenX: number, screenY: number): void;
      endWindowDrag(): void;
      minimize(): void;
      close(): void;
      onObsModeChanged(callback: (enabled: boolean) => void): void;
    };
  }
}
