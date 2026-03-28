import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadProxyShareLinks,
  writeSingBoxConfig
} from "../../services/host-controller/src/proxy-links.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const shareLinksPath = process.env.HOST_PROXY_SHARE_LINKS_PATH ?? resolve(repoRoot, "infra", "data", "proxy", "share-links.local.json");
const configPath = process.env.HOST_PROXY_CONFIG_PATH ?? resolve(repoRoot, "infra", "data", "proxy", "sing-box", "config.json");

const proxyLinks = await loadProxyShareLinks(shareLinksPath);
await writeSingBoxConfig(configPath, proxyLinks);
console.log(configPath);
