export type HostControllerWorkerStartupStatus =
  | "already_running"
  | "started"
  | "startup_timeout";

export interface HostControllerWorkerStatus {
  workerId: string;
  displayName?: string;
  agentPort?: number;
  cdpPort?: number;
  proxyServer?: string;
  status?: HostControllerWorkerStartupStatus;
  startupStatus?: HostControllerWorkerStartupStatus | null;
  agentListening: boolean;
  browserListening: boolean;
  runtimeMode?: "visible_auth" | "hidden_runtime" | "alternate_desktop" | null;
  runtimeClass?:
    | "host_visible_auth"
    | "host_hidden_runtime"
    | "host_alternate_desktop"
    | "docker_headed_xvfb"
    | null;
  runtimeDesktopName?: string | null;
  headless?: boolean | null;
  cdpAttached?: boolean | null;
  proxyServerConfigured?: boolean | null;
  runtimeStatus?: string | null;
}

export interface HostControllerHealthSnapshot {
  proxyListening: boolean;
  proxyServerUrl: string;
  poolStatus: "idle" | "ready" | "degraded";
  workers: HostControllerWorkerStatus[];
}

export interface AlternateDesktopValidationResult {
  workerId: string;
  runtimeClass: string | null;
  runtimeMode: "visible_auth" | "hidden_runtime" | "alternate_desktop" | null;
  result: string;
  phase11Ready: boolean;
  validationPending: boolean;
  proofFailureClass: string | null;
  pageUrl: string | null;
  bootstrapFailureCode: string | null;
  bootstrapStep: string | null;
  relayFailureCode: string | null;
  checkedAt: string;
  runtimeDesktopName: string | null;
  detail: string | null;
}

export interface HostControllerPoolResult extends HostControllerHealthSnapshot {
  action: string;
  runtimeMode?: "visible_auth" | "hidden_runtime" | "alternate_desktop";
}

export interface HostControllerClient {
  startWorker(
    workerId: string,
    runtimeMode?: "visible_auth" | "hidden_runtime" | "alternate_desktop"
  ): Promise<HostControllerPoolResult | Record<string, unknown>>;
  stopWorker(workerId: string): Promise<void>;
  validateAlternateDesktop(
    workerId: string
  ): Promise<AlternateDesktopValidationResult>;
  startPool(): Promise<HostControllerPoolResult>;
  stopPool(): Promise<HostControllerPoolResult>;
  getHealth(): Promise<HostControllerHealthSnapshot>;
  listWorkers(): Promise<HostControllerHealthSnapshot>;
}

function createHostControllerRequestHeaders(token: string | undefined): Headers {
  const headers = new Headers();
  headers.set("content-type", "application/json");

  if (token) {
    headers.set("x-host-controller-token", token);
  }

  return headers;
}

function createHostControllerErrorMessage(
  action: string,
  workerId: string | undefined,
  detail: string | undefined
): string {
  const workerSuffix = workerId ? ` for ${workerId}` : "";
  return `host controller ${action}${workerSuffix} failed${detail ? `: ${detail}` : ""}`;
}

export function createHostControllerClient(
  baseUrl: string,
  token: string | undefined
): HostControllerClient {
  const headers = createHostControllerRequestHeaders(token);

  async function parseErrorDetail(response: Response): Promise<string | undefined> {
    try {
      const body = await response.json();
      return body?.detail || body?.error;
    } catch {
      return undefined;
    }
  }

  async function post<T>(
    pathname: string,
    workerId?: string,
    body: Record<string, unknown> = {}
  ): Promise<T> {
    const response = await fetch(new URL(pathname, `${baseUrl}/`), {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    const detail = await parseErrorDetail(response);

    throw new Error(createHostControllerErrorMessage(pathname, workerId, detail));
  }

  async function get<T>(pathname: string): Promise<T> {
    const response = await fetch(new URL(pathname, `${baseUrl}/`), {
      method: "GET",
      headers
    });

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    const detail = await parseErrorDetail(response);
    throw new Error(createHostControllerErrorMessage(pathname, undefined, detail));
  }

  return {
    async startWorker(workerId, runtimeMode) {
      return post(`/workers/${workerId}/start`, workerId, {
        ...(runtimeMode ? { runtimeMode } : {})
      });
    },
    async stopWorker(workerId) {
      await post(`/workers/${workerId}/stop`, workerId);
    },
    async validateAlternateDesktop(workerId) {
      return post<AlternateDesktopValidationResult>(
        `/workers/${workerId}/validate-alternate-desktop`,
        workerId
      );
    },
    async startPool() {
      return post<HostControllerPoolResult>("/pool/start");
    },
    async stopPool() {
      return post<HostControllerPoolResult>("/pool/stop");
    },
    async getHealth() {
      return get<HostControllerHealthSnapshot>("/health");
    },
    async listWorkers() {
      return get<HostControllerHealthSnapshot>("/workers");
    }
  };
}

export function createNoopHostControllerClient(): HostControllerClient {
  const idleSnapshot: HostControllerHealthSnapshot = {
    proxyListening: false,
    proxyServerUrl: "http://127.0.0.1:7897",
    poolStatus: "idle",
    workers: []
  };

  return {
    async startWorker(_workerId: string, _runtimeMode?: "visible_auth" | "hidden_runtime" | "alternate_desktop") {
      return {};
    },
    async stopWorker(_workerId: string) {},
    async validateAlternateDesktop(workerId: string) {
      return {
        workerId,
        runtimeClass: "host_alternate_desktop",
        runtimeMode: "alternate_desktop",
        result: "alternate_desktop_unreachable",
        phase11Ready: false,
        validationPending: true,
        proofFailureClass: "runtime_unreachable",
        pageUrl: null,
        bootstrapFailureCode: null,
        bootstrapStep: null,
        relayFailureCode: null,
        checkedAt: new Date().toISOString(),
        runtimeDesktopName: null,
        detail: "host controller disabled"
      };
    },
    async startPool() {
      return {
        action: "pool_start_requested",
        runtimeMode: "alternate_desktop",
        ...idleSnapshot
      };
    },
    async stopPool() {
      return {
        action: "pool_stop_requested",
        ...idleSnapshot
      };
    },
    async getHealth() {
      return idleSnapshot;
    },
    async listWorkers() {
      return idleSnapshot;
    }
  };
}
