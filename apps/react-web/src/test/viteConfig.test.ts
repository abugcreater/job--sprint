// @vitest-environment node
import { describe, expect, it } from "vitest";
import config from "../../vite.config";

describe("vite config", () => {
  it("proxies local API requests to a configurable runtime target", async () => {
    const resolved = await (typeof config === "function"
      ? config({ command: "serve", mode: "test", isSsrBuild: false, isPreview: false })
      : config);
    const proxy = resolved.server && typeof resolved.server === "object" ? resolved.server.proxy : undefined;
    const apiProxy = proxy && typeof proxy === "object" ? proxy["/api"] : undefined;

    expect(apiProxy).toEqual(expect.objectContaining({
      target: expect.any(String),
      changeOrigin: true
    }));
  });
});
