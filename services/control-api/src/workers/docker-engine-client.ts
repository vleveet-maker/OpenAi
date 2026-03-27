import { request as httpRequest } from "node:http";

export interface DockerContainerInspect {
  Id: string;
  Name: string;
  State: {
    Status?: string;
    Running?: boolean;
    Restarting?: boolean;
    ExitCode?: number;
  };
}

export interface DockerEngineClient {
  restartContainer(containerName: string, timeoutSeconds: number): Promise<void>;
  inspectContainer(containerName: string): Promise<DockerContainerInspect>;
}

async function readJsonResponse<T>(
  socketPath: string,
  method: string,
  path: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const request = httpRequest(
      {
        socketPath,
        path,
        method
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");

          if ((response.statusCode ?? 500) >= 400) {
            reject(
              new Error(
                body || `Docker Engine API request failed with status ${response.statusCode}`
              )
            );
            return;
          }

          resolve((body ? JSON.parse(body) : {}) as T);
        });
      }
    );

    request.on("error", reject);
    request.end();
  });
}

async function readEmptyResponse(
  socketPath: string,
  method: string,
  path: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = httpRequest(
      {
        socketPath,
        path,
        method
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");

          if ((response.statusCode ?? 500) >= 400) {
            reject(
              new Error(
                body || `Docker Engine API request failed with status ${response.statusCode}`
              )
            );
            return;
          }

          resolve();
        });
      }
    );

    request.on("error", reject);
    request.end();
  });
}

export class SocketDockerEngineClient implements DockerEngineClient {
  constructor(private readonly socketPath: string) {}

  async restartContainer(
    containerName: string,
    timeoutSeconds: number
  ): Promise<void> {
    await readEmptyResponse(
      this.socketPath,
      "POST",
      `/v1.24/containers/${encodeURIComponent(containerName)}/restart?t=${timeoutSeconds}`
    );
  }

  inspectContainer(containerName: string): Promise<DockerContainerInspect> {
    return readJsonResponse<DockerContainerInspect>(
      this.socketPath,
      "GET",
      `/v1.24/containers/${encodeURIComponent(containerName)}/json`
    );
  }
}

export function createDockerEngineClient(
  socketPath: string
): DockerEngineClient {
  return new SocketDockerEngineClient(socketPath);
}
