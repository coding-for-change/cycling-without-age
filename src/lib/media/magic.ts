const EBML = [0x1a, 0x45, 0xdf, 0xa3];

export function looksLikeVideo(head: Buffer): boolean {
  if (head.length >= 12 && head.subarray(4, 8).toString("latin1") === "ftyp")
    return true;
  return head.length >= 4 && EBML.every((byte, index) => head[index] === byte);
}
