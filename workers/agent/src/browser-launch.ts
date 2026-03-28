import { rmSync } from "node:fs";
import { join } from "node:path";

import { chromium, type BrowserContext } from "playwright";

export interface WorkerBrowserLaunchOptions {
  workerId: string;
  profilePath?: string;
  profileRoot?: string;
  browserChannel?: string;
  headless?: boolean;
  startUrl?: string;
  startUrlNavigationTimeoutMs?: number;
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

export async function launchWorkerBrowser(
  options: WorkerBrowserLaunchOptions
): Promise<BrowserContext> {
  const profilePath =
    options.profilePath ??
    getWorkerProfilePath(options.workerId, options.profileRoot);
  const launchOptions: LaunchPersistentContextOptions = {
    headless: options.headless ?? false,
    channel: options.browserChannel,
    args: [
      "--disable-dev-shm-usage",
      "--no-default-browser-check"
    ]
  };

  clearChromiumSingletonArtifacts(profilePath);

  const context = await chromium.launchPersistentContext(
    profilePath,
    launchOptions
  );

  const page = context.pages()[0] ?? (await context.newPage());

  if (options.startUrl) {
    try {
      // Keep browser bootstrap bounded so health stays reachable during challenge pages.
      await page.goto(options.startUrl, {
        waitUntil: "domcontentloaded",
        timeout: options.startUrlNavigationTimeoutMs ?? 15_000
      });
    } catch (error: unknown) {
      console.warn(
        `[worker-browser] initial navigation to ${options.startUrl} did not finish for ${options.workerId}`,
        error
      );
    }
  }

  return context;
}
