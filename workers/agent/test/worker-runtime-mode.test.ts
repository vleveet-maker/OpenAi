import { describe, expect, it } from "vitest";

import {
  createPersistentLaunchOptions,
  launchWorkerBrowser,
  resolveBrowserTransport
} from "../src/browser-launch.js";
import { loadWorkerAgentConfig } from "../src/server.js";

describe("worker runtime mode", () => {
  it("prefers CDP for visible_auth when a CDP endpoint is configured", () => {
    const config = loadWorkerAgentConfig({
      WORKER_ID: "dad",
      WORKER_RUNTIME_MODE: "visible_auth",
      WORKER_CDP_ENDPOINT_URL: "http://127.0.0.1:9222",
      WORKER_HEADLESS: "false"
    });

    expect(config.runtimeMode).toBe("visible_auth");
    expect(config.headless).toBe(false);
    expect(
      resolveBrowserTransport({
        workerId: "dad",
        runtimeMode: config.runtimeMode,
        cdpEndpointUrl: config.cdpEndpointUrl
      })
    ).toBe("cdp");
  });

  it("forces hidden_runtime into persistent headless launch with proxy propagation", () => {
    const config = loadWorkerAgentConfig({
      WORKER_ID: "wife",
      WORKER_RUNTIME_MODE: "hidden_runtime",
      WORKER_PROXY_SERVER: "http://127.0.0.1:7897",
      WORKER_HEADLESS: "false"
    });

    expect(config.runtimeMode).toBe("hidden_runtime");
    expect(config.headless).toBe(true);
    expect(
      resolveBrowserTransport({
        workerId: "wife",
        runtimeMode: config.runtimeMode,
        cdpEndpointUrl: config.cdpEndpointUrl
      })
    ).toBe("persistent");

    const launchOptions = createPersistentLaunchOptions({
      workerId: "wife",
      runtimeMode: config.runtimeMode,
      browserExecutablePath: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      proxyServer: config.proxyServer,
      headless: config.headless
    });

    expect(launchOptions.headless).toBe(true);
    expect(launchOptions.args).toContain("--proxy-server=http://127.0.0.1:7897");
  });

  it("rejects a hidden_runtime launch when a CDP endpoint is still configured", async () => {
    await expect(
      launchWorkerBrowser({
        workerId: "shared-1",
        runtimeMode: "hidden_runtime",
        cdpEndpointUrl: "http://127.0.0.1:9224",
        browserExecutablePath: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
      })
    ).rejects.toThrow("hidden_runtime_requires_no_cdp_endpoint");
  });
});
