import { rmSync } from "node:fs";
import { join } from "node:path";

import { chromium, type BrowserContext } from "playwright";

export type WorkerRuntimeMode =
  | "visible_auth"
  | "hidden_runtime"
  | "alternate_desktop";
export type WorkerRuntimeClass =
  | "host_hidden_runtime"
  | "host_visible_auth"
  | "host_alternate_desktop"
  | "docker_headed_xvfb";

export interface WorkerBrowserLaunchOptions {
  workerId: string;
  profilePath?: string;
  profileRoot?: string;
  runtimeMode?: WorkerRuntimeMode;
  runtimeClass?: WorkerRuntimeClass;
  browserChannel?: string;
  browserExecutablePath?: string;
  headless?: boolean;
  startUrl?: string;
  startUrlNavigationTimeoutMs?: number;
  cdpEndpointUrl?: string;
  cdpConnectionTimeoutMs?: number;
  proxyServer?: string;
}

export const WORKER_PROFILE_ROOT = "/srv/chatgpt-workers/profiles";
const CHROMIUM_SINGLETON_ARTIFACTS = [
  "SingletonCookie",
  "SingletonLock",
  "SingletonSocket",
  "Default/LOCK"
] as const;

type LaunchPersistentContextOptions =
  Parameters<typeof chromium.launchPersistentContext>[1];

export interface WorkerBrowserHandle {
  browserContext: BrowserContext;
  dispose(): Promise<void>;
}

export function resolveBrowserTransport(
  options: WorkerBrowserLaunchOptions
): "cdp" | "persistent" {
  if (options.runtimeMode === "hidden_runtime") {
    return "persistent";
  }

  return options.cdpEndpointUrl ? "cdp" : "persistent";
}

export function createPersistentLaunchOptions(
  options: WorkerBrowserLaunchOptions
): LaunchPersistentContextOptions {
  const launchOptions: LaunchPersistentContextOptions = {
    headless:
      options.runtimeClass === "docker_headed_xvfb"
        ? false
        : options.runtimeMode === "hidden_runtime"
        ? true
        : options.headless ?? false,
    args: [
      "--disable-dev-shm-usage",
      "--no-default-browser-check"
    ]
  };

  if (options.proxyServer) {
    launchOptions.args?.push(`--proxy-server=${options.proxyServer}`);
  }

  if (options.browserExecutablePath) {
    launchOptions.executablePath = options.browserExecutablePath;
  } else {
    launchOptions.channel = options.browserChannel;
  }

  return launchOptions;
}

export function getWorkerProfilePath(
  workerId: string,
  profileRoot: string = WORKER_PROFILE_ROOT
): string {
  return `${profileRoot}/${workerId}`;
}

export function clearChromiumSingletonArtifacts(profilePath: string): void {
  for (const artifact of CHROMIUM_SINGLETON_ARTIFACTS) {
    rmSync(join(profilePath, artifact), {
      force: true,
      recursive: true
    });
  }
}

async function ensureStartPage(
  context: BrowserContext,
  startUrl: string | undefined,
  navigationTimeoutMs: number
): Promise<void> {
  const page = context.pages()[0] ?? (await context.newPage());

  if (!startUrl) {
    return;
  }

  const currentUrl =
    typeof page.url === "function"
      ? page.url().trim().toLowerCase()
      : "";

  if (currentUrl.length > 0 && currentUrl !== "about:blank") {
    return;
  }

  try {
    // Keep browser bootstrap bounded so health stays reachable during challenge pages.
    await page.goto(startUrl, {
      waitUntil: "domcontentloaded",
      timeout: navigationTimeoutMs
    });
  } catch (error: unknown) {
    console.warn(
      `[worker-browser] initial navigation to ${startUrl} did not finish for bootstrap`,
      error
    );
  }
}

async function launchPersistentWorkerBrowser(
  options: WorkerBrowserLaunchOptions
): Promise<WorkerBrowserHandle> {
  const profilePath =
    options.profilePath ??
    getWorkerProfilePath(options.workerId, options.profileRoot);
  const launchOptions = createPersistentLaunchOptions(options);
  const navigationTimeoutMs = options.startUrlNavigationTimeoutMs ?? 15_000;

  clearChromiumSingletonArtifacts(profilePath);

  const context = await chromium.launchPersistentContext(
    profilePath,
    launchOptions
  );

  await ensureStartPage(context, options.startUrl, navigationTimeoutMs);

  return {
    browserContext: context,
    async dispose() {
      await context.close();
    }
  };
}

async function connectWorkerBrowserOverCdp(
  options: WorkerBrowserLaunchOptions
): Promise<WorkerBrowserHandle> {
  if (!options.cdpEndpointUrl) {
    throw new Error("cdp_endpoint_url_missing");
  }

  const browser = await chromium.connectOverCDP(options.cdpEndpointUrl, {
    timeout: options.cdpConnectionTimeoutMs ?? 15_000
  });
  const context = browser.contexts()[0];

  if (!context) {
    throw new Error(`cdp_default_context_not_found:${options.cdpEndpointUrl}`);
  }

  await ensureStartPage(
    context,
    options.startUrl,
    options.startUrlNavigationTimeoutMs ?? 15_000
  );

  return {
    browserContext: context,
    async dispose() {
      // Keep the operator's native browser alive if the agent process stops.
    }
  };
}

export async function launchWorkerBrowser(
  options: WorkerBrowserLaunchOptions
): Promise<WorkerBrowserHandle> {
  if (
    options.runtimeMode === "hidden_runtime" &&
    options.cdpEndpointUrl
  ) {
    throw new Error("hidden_runtime_requires_no_cdp_endpoint");
  }

  if (
    options.runtimeMode === "alternate_desktop" &&
    !options.cdpEndpointUrl
  ) {
    throw new Error("alternate_desktop_requires_cdp_endpoint");
  }

  if (resolveBrowserTransport(options) === "cdp") {
    return connectWorkerBrowserOverCdp(options);
  }

  return launchPersistentWorkerBrowser(options);
}
