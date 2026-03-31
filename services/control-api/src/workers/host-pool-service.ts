import type {
  HostControllerClient,
  HostControllerHealthSnapshot,
  HostControllerBrowserWindowMode,
  HostControllerRuntimeMode,
  HostControllerWorkerStatus
} from "./host-controller-client.js";
import type {
  WorkerRegistry,
  WorkerRuntimeCapability
} from "./worker-registry.js";

export type HostPoolStatus =
  | "idle"
  | "starting"
  | "ready"
  | "degraded"
  | "stopping"
  | "failed";

export interface HostPoolSnapshot {
  status: HostPoolStatus;
  lastAction: "start_requested" | "stop_requested" | null;
  controllerReachable: boolean;
  proxyListening: boolean;
  proxyServerUrl: string | null;
  routineRuntimeMode: HostControllerRuntimeMode;
  routineRuntimeClass:
    | "host_visible_auth"
    | "host_visible_compact"
    | "host_hidden_runtime"
    | "host_alternate_desktop";
  routineBrowserWindowMode: HostControllerBrowserWindowMode;
  updatedAt: string;
  lastError: string | null;
  workers: Array<
    HostControllerWorkerStatus & {
      runtimeCapability: WorkerRuntimeCapability;
    }
  >;
}

export interface HostPoolServiceOptions {
  hostControllerClient: HostControllerClient;
  workerRegistry?: WorkerRegistry;
}

const DEFAULT_HOST_ROUTINE_RUNTIME_MODE = "visible_auth";
const DEFAULT_HOST_ROUTINE_RUNTIME_CLASS = "host_visible_compact";
const DEFAULT_HOST_ROUTINE_BROWSER_WINDOW_MODE = "CompactCorner";

export class HostPoolServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    public readonly detail: string
  ) {
    super(detail);
  }
}

function cloneSnapshot(snapshot: HostPoolSnapshot): HostPoolSnapshot {
  return {
    ...snapshot,
    routineRuntimeMode: snapshot.routineRuntimeMode,
    routineRuntimeClass: snapshot.routineRuntimeClass,
    routineBrowserWindowMode: snapshot.routineBrowserWindowMode,
    workers: snapshot.workers.map((worker) => ({
      ...worker
    }))
  };
}

function hasAnyReachableWorker(health: HostControllerHealthSnapshot): boolean {
  return health.workers.some(
    (worker) => worker.agentListening || worker.browserListening
  );
}

function deriveRuntimeCapabilityFromControllerRow(
  worker: HostControllerWorkerStatus,
  workerRegistry: WorkerRegistry | undefined
): WorkerRuntimeCapability {
  const registryWorker = workerRegistry?.getWorker(worker.workerId);

  if (!worker.agentListening || worker.runtimeStatus === "disconnected") {
    return "unreachable";
  }

  if (registryWorker?.runtimeCapability === "usable") {
    return "usable";
  }

  if (worker.agentListening || worker.browserListening) {
    return "reachable_but_unusable";
  }

  return "unreachable";
}

function normalizeWorkerRow(
  worker: HostControllerWorkerStatus,
  workerRegistry: WorkerRegistry | undefined
): HostControllerWorkerStatus & {
  runtimeCapability: WorkerRuntimeCapability;
} {
  const registryWorker = workerRegistry?.getWorker(worker.workerId);
  const runtimeMode =
    worker.runtimeMode ??
    (registryWorker?.runtimeType === "host"
      ? DEFAULT_HOST_ROUTINE_RUNTIME_MODE
      : null);
  const runtimeClass =
    worker.runtimeClass ??
    (runtimeMode === DEFAULT_HOST_ROUTINE_RUNTIME_MODE
      ? DEFAULT_HOST_ROUTINE_RUNTIME_CLASS
      : runtimeMode === "alternate_desktop"
        ? "host_alternate_desktop"
        : registryWorker?.runtimeClass ?? null);
  const runtimeDesktopName =
    worker.runtimeDesktopName ?? registryWorker?.runtimeDesktopName ?? null;

  return {
    ...worker,
    runtimeMode,
    runtimeClass,
    runtimeDesktopName,
    runtimeCapability: deriveRuntimeCapabilityFromControllerRow(
      worker,
      workerRegistry
    )
  };
}

export class HostPoolService {
  private snapshot: HostPoolSnapshot = {
    status: "idle",
    lastAction: null,
    controllerReachable: false,
    proxyListening: false,
    proxyServerUrl: null,
    routineRuntimeMode: DEFAULT_HOST_ROUTINE_RUNTIME_MODE,
    routineRuntimeClass: DEFAULT_HOST_ROUTINE_RUNTIME_CLASS,
    routineBrowserWindowMode: DEFAULT_HOST_ROUTINE_BROWSER_WINDOW_MODE,
    updatedAt: new Date().toISOString(),
    lastError: null,
    workers: []
  };

  private activeAction: "starting" | "stopping" | null = null;

  constructor(private readonly options: HostPoolServiceOptions) {}

  getSnapshot(): HostPoolSnapshot {
    return cloneSnapshot(this.snapshot);
  }

  async startPool(
    runtimeMode?: HostControllerRuntimeMode,
    browserWindowMode?: HostControllerBrowserWindowMode,
    now: Date = new Date()
  ): Promise<HostPoolSnapshot> {
    if (this.activeAction) {
      throw new HostPoolServiceError(
        409,
        "host_pool_busy",
        `Host pool is currently ${this.activeAction}`
      );
    }

    const requestedRuntimeMode =
      runtimeMode ?? DEFAULT_HOST_ROUTINE_RUNTIME_MODE;
    const requestedBrowserWindowMode =
      browserWindowMode ?? DEFAULT_HOST_ROUTINE_BROWSER_WINDOW_MODE;
    const requestedRuntimeClass =
      requestedRuntimeMode === "visible_auth" &&
      requestedBrowserWindowMode === "CompactCorner"
        ? "host_visible_compact"
        : requestedRuntimeMode === "alternate_desktop"
          ? "host_alternate_desktop"
          : "host_visible_auth";

    this.activeAction = "starting";
    this.snapshot = {
      ...this.snapshot,
      status: "starting",
      lastAction: "start_requested",
      routineRuntimeMode: requestedRuntimeMode,
      routineRuntimeClass: requestedRuntimeClass,
      routineBrowserWindowMode: requestedBrowserWindowMode,
      updatedAt: now.toISOString(),
      lastError: null
    };

    try {
      await this.options.hostControllerClient.startPool(
        requestedRuntimeMode,
        requestedBrowserWindowMode
      );
    } catch (error: unknown) {
      const detail =
        error instanceof Error ? error.message : "host pool start failed";
      this.activeAction = null;
      this.snapshot = {
        ...this.snapshot,
        status: "failed",
        controllerReachable: false,
        updatedAt: now.toISOString(),
        lastError: detail
      };
      throw new HostPoolServiceError(
        502,
        "host_pool_start_failed",
        detail
      );
    }

    return this.refresh();
  }

  async stopPool(now: Date = new Date()): Promise<HostPoolSnapshot> {
    if (this.activeAction) {
      throw new HostPoolServiceError(
        409,
        "host_pool_busy",
        `Host pool is currently ${this.activeAction}`
      );
    }

    this.activeAction = "stopping";
    this.snapshot = {
      ...this.snapshot,
      status: "stopping",
      lastAction: "stop_requested",
      routineRuntimeMode: this.snapshot.routineRuntimeMode,
      routineRuntimeClass: this.snapshot.routineRuntimeClass,
      routineBrowserWindowMode: this.snapshot.routineBrowserWindowMode,
      updatedAt: now.toISOString(),
      lastError: null
    };

    try {
      await this.options.hostControllerClient.stopPool();
    } catch (error: unknown) {
      const detail =
        error instanceof Error ? error.message : "host pool stop failed";
      this.activeAction = null;
      this.snapshot = {
        ...this.snapshot,
        status: "failed",
        controllerReachable: false,
        updatedAt: now.toISOString(),
        lastError: detail
      };
      throw new HostPoolServiceError(
        502,
        "host_pool_stop_failed",
        detail
      );
    }

    return this.refresh();
  }

  async refresh(now: Date = new Date()): Promise<HostPoolSnapshot> {
    try {
      const health = await this.options.hostControllerClient.getHealth();
      const freshWorkers = health.workers.map((worker) =>
        normalizeWorkerRow(worker, this.options.workerRegistry)
      );
      const nextWorkers =
        freshWorkers.length > 0 ? freshWorkers : this.snapshot.workers;
      const nextStatus = this.resolveStatus(health);

      if (
        this.activeAction === "starting" &&
        (nextStatus === "ready" || nextStatus === "degraded")
      ) {
        this.activeAction = null;
      } else if (
        this.activeAction === "stopping" &&
        nextStatus === "idle"
      ) {
        this.activeAction = null;
      }

      this.snapshot = {
        status: nextStatus,
        lastAction: this.snapshot.lastAction,
        controllerReachable: true,
        proxyListening: health.proxyListening,
        proxyServerUrl: health.proxyServerUrl,
        routineRuntimeMode: this.snapshot.routineRuntimeMode,
        routineRuntimeClass: this.snapshot.routineRuntimeClass,
        routineBrowserWindowMode: this.snapshot.routineBrowserWindowMode,
        updatedAt: now.toISOString(),
        lastError:
          nextStatus === "failed" ? this.snapshot.lastError : null,
        workers: nextWorkers
      };
    } catch (error: unknown) {
      this.activeAction = null;
      this.snapshot = {
        ...this.snapshot,
        status: "failed",
        controllerReachable: false,
        routineRuntimeMode: this.snapshot.routineRuntimeMode,
        routineRuntimeClass: this.snapshot.routineRuntimeClass,
        routineBrowserWindowMode: this.snapshot.routineBrowserWindowMode,
        updatedAt: now.toISOString(),
        lastError:
          error instanceof Error ? error.message : "host controller unavailable"
      };
    }

    return this.getSnapshot();
  }

  private resolveStatus(health: HostControllerHealthSnapshot): HostPoolStatus {
    if (this.activeAction === "starting") {
      if (health.poolStatus === "ready") {
        return "ready";
      }

      if (health.proxyListening || hasAnyReachableWorker(health)) {
        return "degraded";
      }

      return "starting";
    }

    if (this.activeAction === "stopping") {
      if (health.poolStatus === "idle") {
        return "idle";
      }

      return "stopping";
    }

    if (health.poolStatus === "ready") {
      return "ready";
    }

    if (health.poolStatus === "idle") {
      return "idle";
    }

    return "degraded";
  }
}

export function createHostPoolService(
  options: HostPoolServiceOptions
): HostPoolService {
  return new HostPoolService(options);
}
