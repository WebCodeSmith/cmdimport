declare module '@zxing/library' {
  export class BrowserMultiFormatReader {
    constructor()
    decodeFromVideoDevice(deviceId: string | null, videoElement: HTMLVideoElement, callback: (result: Result | null, err: Error | null) => void): void
    reset?(): void
  }

  export class Result {
    getText(): string
  }
}
