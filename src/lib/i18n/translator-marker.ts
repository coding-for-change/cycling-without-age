const INVISIBLE = [0x200c, 0x200d].map((code) => String.fromCharCode(code));

const markers = new Map<string, string>();

function encode(key: string, ns: string): string {
  const bytes = new TextEncoder().encode(
    `${JSON.stringify({ k: key, n: ns })}\n`,
  );
  return Array.from(bytes, (byte) => `${byte.toString(2).padStart(8, "0")}0`)
    .join("")
    .replace(/[01]/g, (bit) => INVISIBLE[Number(bit)]);
}

export function keyMarker(key: string, ns: string): string {
  const id = `${ns}\u0000${key}`;
  let marker = markers.get(id);
  if (marker === undefined) {
    marker = encode(key, ns);
    markers.set(id, marker);
  }
  return marker;
}
