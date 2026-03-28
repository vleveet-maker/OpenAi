export interface HostControllerClient {
  startWorker(workerId: string): Promise<void>;
  stopWorker(workerId: string): Promise<void>;
  startPool(): Promise<void>;
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

  async function post(pathname: string, workerId?: string): Promise<void> {
    const response = await fetch(new URL(pathname, `${baseUrl}/`), {
      method: "POST",
      headers,
      body: "{}"
    });

    if (response.ok) {
      return;
    }

    let detail;

    try {
      const body = await response.json();
      detail = body?.detail || body?.error;
    } catch {
      detail = undefined;
    }

    throw new Error(createHostControllerErrorMessage(pathname, workerId, detail));
  }

  return {
    async startWorker(workerId) {
      await post(`/workers/${workerId}/start`, workerId);
    },
    async stopWorker(workerId) {
      await post(`/workers/${workerId}/stop`, workerId);
    },
    async startPool() {
      await post("/pool/start");
    }
  };
}

export function createNoopHostControllerClient(): HostControllerClient {
  return {
    async startWorker(_workerId: string) {},
    async stopWorker(_workerId: string) {},
    async startPool() {}
  };
}
