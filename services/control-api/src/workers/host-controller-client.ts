export interface HostControllerWorkerStatus {
  workerId: string;
  displayName?: string;
  agentPort?: number;
  cdpPort?: number;
  proxyServer?: string;
  agentListening: boolean;
  browserListening: boolean;
}

export interface HostControllerHealthSnapshot {
  proxyListening: boolean;
  proxyServerUrl: string;
  poolStatus: "idle" | "ready" | "degraded";
  workers: HostControllerWorkerStatus[];
}

export interface HostControllerPoolResult extends HostControllerHealthSnapshot {
  action: string;
}

export interface HostControllerClient {
  startWorker(workerId: string): Promise<void>;
  stopWorker(workerId: string): Promise<void>;
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

  async function post<T>(pathname: string, workerId?: string): Promise<T> {
    const response = await fetch(new URL(pathname, `${baseUrl}/`), {
      method: "POST",
      headers,
      body: "{}"
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
    async startWorker(workerId) {
      await post(`/workers/${workerId}/start`, workerId);
    },
    async stopWorker(workerId) {
      await post(`/workers/${workerId}/stop`, workerId);
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
    async startWorker(_workerId: string) {},
    async stopWorker(_workerId: string) {},
    async startPool() {
      return {
        action: "pool_start_requested",
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
