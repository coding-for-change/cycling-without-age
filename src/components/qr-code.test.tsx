import { renderToStaticMarkup } from "react-dom/server";
import { QrCode } from "@/components/qr-code";

const VALUE = "https://cwa.codingforchange.com/join/muenchen";

describe("QrCode", () => {
  it("draws one rect per dark module, on a square viewBox", () => {
    const svg = renderToStaticMarkup(<QrCode value={VALUE} />);

    const size = Number(/viewBox="0 0 (\d+) \1"/.exec(svg)?.[1]);
    expect(size).toBeGreaterThan(20);

    const rects = svg.match(/<rect /g) ?? [];
    expect(rects.length).toBeGreaterThan(size);
    expect(rects.length).toBeLessThan(size * size);
    expect(svg).toContain('fill="currentColor"');
  });

  it("labels itself with the value it encodes and stays on brand", () => {
    const svg = renderToStaticMarkup(<QrCode value={VALUE} />);

    expect(svg).toContain('role="img"');
    expect(svg).toContain(`aria-label="${VALUE}"`);
    expect(svg).toContain('class="text-ink"');
  });

  it("is pure, so two renders of the same value match", () => {
    expect(renderToStaticMarkup(<QrCode value={VALUE} />)).toBe(
      renderToStaticMarkup(<QrCode value={VALUE} />),
    );
  });
});
