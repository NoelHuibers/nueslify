/** Builds a mono 8 kHz 16-bit PCM WAV file of silence. Used by the mock speech model. */
export function silentWav(durationMs: number, sampleRate = 8000): Uint8Array {
  const samples = Math.max(1, Math.round((durationMs / 1000) * sampleRate));
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, dataSize, true);

  return new Uint8Array(buffer);
}

/** Tiny silent clip as a data URI; playing it inside a click handler unlocks audio on iOS/Safari. */
export function silentWavDataUri(durationMs = 50): string {
  let binary = "";
  for (const byte of silentWav(durationMs)) {
    binary += String.fromCharCode(byte);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}
