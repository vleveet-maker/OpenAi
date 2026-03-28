import type { Request, RequestHandler } from "express";

export interface InternalAdminGuardOptions {
  internalAdminToken?: string;
  allowPrivateNetworks?: boolean;
}

function extractClientAddress(request: Request): string | undefined {
  const forwardedFor = request.header("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return request.socket.remoteAddress ?? request.ip ?? undefined;
}

function isPrivateOrLoopbackAddress(address: string | undefined): boolean {
  if (!address) {
    return false;
  }

  return (
    address === "::1" ||
    address === "127.0.0.1" ||
    address === "::ffff:127.0.0.1" ||
    address.startsWith("10.") ||
    address.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

export function requireInternalAdmin(
  options: InternalAdminGuardOptions = {}
): RequestHandler {
  return (request, response, next) => {
    const clientAddress = extractClientAddress(request);
    const providedToken = request.header("x-internal-admin-token");
    const tokenMatches =
      Boolean(options.internalAdminToken) &&
      providedToken === options.internalAdminToken;
    const networkAllowed =
      options.allowPrivateNetworks === true &&
      isPrivateOrLoopbackAddress(clientAddress);

    if (tokenMatches || networkAllowed) {
      next();
      return;
    }

    response.status(403).json({
      error: "internal_only",
      detail: "internal admin guard rejected the request"
    });
  };
}
