import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function decodeShareLinkName(parsedUrl) {
  const hash = parsedUrl.hash.startsWith("#") ? parsedUrl.hash.slice(1) : parsedUrl.hash;
  return hash ? decodeURIComponent(hash) : undefined;
}

function normalizeBase64(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return normalized + padding;
}

function decodeShadowsocksUserInfo(parsedUrl) {
  const rawUserInfo = parsedUrl.username;

  if (!rawUserInfo) {
    throw new Error("shadowsocks_userinfo_missing");
  }

  const decoded = Buffer.from(normalizeBase64(rawUserInfo), "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex <= 0) {
    throw new Error("shadowsocks_credentials_invalid");
  }

  return {
    method: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1)
  };
}

function buildRealityTls(parsedUrl) {
  const searchParams = parsedUrl.searchParams;
  const security = searchParams.get("security");

  if (security !== "reality") {
    return {
      enabled: true,
      server_name: searchParams.get("sni") ?? parsedUrl.hostname
    };
  }

  return {
    enabled: true,
    server_name: searchParams.get("sni") ?? parsedUrl.hostname,
    utls: {
      enabled: true,
      fingerprint: searchParams.get("fp") ?? "chrome"
    },
    reality: {
      enabled: true,
      public_key: searchParams.get("pbk"),
      short_id: searchParams.get("sid") ?? ""
    }
  };
}

function parseVlessLink(parsedUrl, tag) {
  const tls = buildRealityTls(parsedUrl);

  return {
    type: "vless",
    tag,
    server: parsedUrl.hostname,
    server_port: Number.parseInt(parsedUrl.port || "443", 10),
    uuid: decodeURIComponent(parsedUrl.username),
    network: parsedUrl.searchParams.get("type") ?? "tcp",
    tls
  };
}

function parseTrojanLink(parsedUrl, tag) {
  const tls = buildRealityTls(parsedUrl);

  return {
    type: "trojan",
    tag,
    server: parsedUrl.hostname,
    server_port: Number.parseInt(parsedUrl.port || "443", 10),
    password: decodeURIComponent(parsedUrl.username),
    tls
  };
}

function parseShadowsocksLink(parsedUrl, tag) {
  const credentials = decodeShadowsocksUserInfo(parsedUrl);

  return {
    type: "shadowsocks",
    tag,
    server: parsedUrl.hostname,
    server_port: Number.parseInt(parsedUrl.port || "443", 10),
    method: credentials.method,
    password: credentials.password,
    network: parsedUrl.searchParams.get("type") ?? "tcp"
  };
}

export function parseProxyShareLink(rawEntry, index) {
  const urlValue =
    typeof rawEntry === "string"
      ? rawEntry
      : rawEntry && typeof rawEntry === "object" && typeof rawEntry.url === "string"
        ? rawEntry.url
        : null;

  if (!urlValue) {
    throw new Error(`proxy_link_missing_url:${index}`);
  }

  const parsedUrl = new URL(urlValue);
  const tag =
    (typeof rawEntry === "object" && rawEntry && typeof rawEntry.tag === "string"
      ? rawEntry.tag
      : decodeShareLinkName(parsedUrl)) ??
    `proxy-${index + 1}`;

  switch (parsedUrl.protocol) {
    case "vless:":
      return parseVlessLink(parsedUrl, tag);
    case "trojan:":
      return parseTrojanLink(parsedUrl, tag);
    case "ss:":
      return parseShadowsocksLink(parsedUrl, tag);
    default:
      throw new Error(`proxy_link_unsupported:${parsedUrl.protocol}`);
  }
}

export async function loadProxyShareLinks(shareLinksPath) {
  const raw = await readFile(shareLinksPath, "utf8");
  const parsed = JSON.parse(raw);
  const links = Array.isArray(parsed.links) ? parsed.links : [];

  if (links.length === 0) {
    throw new Error("proxy_links_empty");
  }

  const listenHost =
    parsed.listen && typeof parsed.listen.host === "string"
      ? parsed.listen.host
      : "127.0.0.1";
  const listenPort =
    parsed.listen && Number.isFinite(Number(parsed.listen.port))
      ? Number(parsed.listen.port)
      : 7897;
  const testUrl =
    typeof parsed.testUrl === "string" && parsed.testUrl.trim().length > 0
      ? parsed.testUrl
      : "https://www.gstatic.com/generate_204";

  return {
    listenHost,
    listenPort,
    testUrl,
    links: links.map((entry, index) => parseProxyShareLink(entry, index))
  };
}

export function buildSingBoxConfig(proxyConfig) {
  const outboundTags = proxyConfig.links.map((link) => link.tag);

  return {
    log: {
      level: "info",
      timestamp: true
    },
    inbounds: [
      {
        type: "mixed",
        tag: "mixed-in",
        listen: proxyConfig.listenHost,
        listen_port: proxyConfig.listenPort,
        set_system_proxy: false
      }
    ],
    outbounds: [
      ...proxyConfig.links,
      {
        type: "urltest",
        tag: "auto",
        outbounds: outboundTags,
        url: proxyConfig.testUrl,
        interval: "3m",
        tolerance: 50,
        idle_timeout: "30m",
        interrupt_exist_connections: false
      },
      {
        type: "direct",
        tag: "direct"
      },
      {
        type: "block",
        tag: "block"
      }
    ],
    route: {
      auto_detect_interface: true,
      final: "auto"
    }
  };
}

export async function writeSingBoxConfig(proxyConfigPath, proxyConfig) {
  await mkdir(dirname(proxyConfigPath), { recursive: true });
  await writeFile(
    proxyConfigPath,
    JSON.stringify(buildSingBoxConfig(proxyConfig), null, 2) + "\n",
    "utf8"
  );
}
