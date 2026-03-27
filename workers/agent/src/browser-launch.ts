import { chromium, type BrowserContext } from "playwright";

export interface WorkerBrowserLaunchOptions {
  workerId: string;
  profilePath?: string;
  profileRoot?: string;
  browserChannel?: string;
  headless?: boolean;
  startUrl?: string;
}

export const WORKER_PROFILE_ROOT = "/srv/chatgpt-workers/profiles";

type LaunchPersistentContextOptions =
  Parameters<typeof chromium.launchPersistentContext>[1];

export function getWorkerProfilePath(
  workerId: string,
  profileRoot: string = WORKER_PROFILE_ROOT
): string {
  return `${profileRoot}/${workerId}`;
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

  const context = await chromium.launchPersistentContext(
    profilePath,
    launchOptions
  );

  const page = context.pages()[0] ?? (await context.newPage());

  if (options.startUrl) {
    await page.goto(options.startUrl, {
      waitUntil: "domcontentloaded"
    });
  }

  return context;
}
