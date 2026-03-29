import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EDGE_TEMPLATE_PATH = resolve(
  REPO_ROOT,
  "infra",
  "nginx",
  "default.conf.template"
);

describe("edge nginx template", () => {
  it("splits public and internal entrypoints and injects the admin token", () => {
    const template = readFileSync(EDGE_TEMPLATE_PATH, "utf8");

    expect(template).toContain("listen 8080;");
    expect(template).toContain("listen 8081;");
    expect(template).toContain("location ^~ /internal/");
    expect(template).toContain("proxy_read_timeout 300s;");
    expect(template).toContain("proxy_send_timeout 300s;");
    expect(template).toContain('proxy_set_header x-internal-admin-token "${INTERNAL_ADMIN_TOKEN}";');
    expect(template).toContain("proxy_pass http://control_api_upstream;");
    expect(template).toContain("proxy_pass http://session_client_upstream;");
    expect(template).toContain("location = /healthz {\n    return 404;");
    expect(template).toContain("location = /readyz {\n    return 404;");
  });

  it("protects internal browser viewer proxying behind auth_request", () => {
    const template = readFileSync(EDGE_TEMPLATE_PATH, "utf8");

    expect(template).toContain("location ^~ /internal/browser/");
    expect(template).toContain("return 404;");
    expect(template).toContain("resolver 127.0.0.11 ipv6=off;");
    expect(template).toContain("auth_request /internal/browser-access/authorize;");
    expect(template).toContain("worker-dad:6080");
    expect(template).toContain("worker-wife:6080");
    expect(template).toContain("worker-shared-1:6080");
  });
});
