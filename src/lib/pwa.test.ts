import { describe, expect, it } from "vitest";

import { ehIOS, estaInstalado } from "./pwa";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const IPAD_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

describe("ehIOS", () => {
  it("reconhece iPhone e iPad (inclusive o iPad que se apresenta como Mac)", () => {
    expect(ehIOS(IPHONE, 5)).toBe(true);
    expect(ehIOS(IPAD_DESKTOP, 5)).toBe(true);
  });
  it("não confunde Android nem Mac de verdade (sem toque)", () => {
    expect(ehIOS(ANDROID, 5)).toBe(false);
    expect(ehIOS(IPAD_DESKTOP, 0)).toBe(false);
  });
});

describe("estaInstalado", () => {
  it("é verdadeiro aberto como app (display-mode standalone ou navigator.standalone do iPhone)", () => {
    expect(estaInstalado({ standalone: true, iosStandalone: undefined })).toBe(true);
    expect(estaInstalado({ standalone: false, iosStandalone: true })).toBe(true);
    expect(estaInstalado({ standalone: false, iosStandalone: undefined })).toBe(false);
  });
});
