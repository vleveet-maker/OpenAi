import { describe, expect, it } from "vitest";

import {
  createPersistentLaunchOptions,
  launchWorkerBrowser,
  resolveBrowserTransport
} from "../src/browser-launch.js";

describe("browser launch contracts", () => {
  it("uses CDP transport for alternate_desktop runtime", () => {
    expect(
      resolveBrowserTransport({
        workerId: "dad",
        runtimeMode: "alternate_desktop",
        cdpEndpointUrl: "http://127.0.0.1:9222"
      })
    ).toBe("cdp");
  });

  it("rejects alternate_desktop launches without a CDP endpoint", async () => {
    await expect(
      launchWorkerBrowser({
        workerId: "dad",
        runtimeMode: "alternate_desktop",
        browserExecutablePath: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
      })
    ).rejects.toThrow("alternate_desktop_requires_cdp_endpoint");
  });

  it("keeps alternate_desktop launches non-headless", () => {
    const launchOptions = createPersistentLaunchOptions({
      workerId: "dad",
      runtimeMode: "alternate_desktop",
      browserChannel: "msedge",
      headless: false
    });

    expect(launchOptions.headless).toBe(false);
  });
});
