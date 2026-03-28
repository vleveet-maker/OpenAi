import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

test("build-sing-box-config script writes runtime config from local share links", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "host-proxy-config-"));

  try {
    const shareLinksPath = join(tempRoot, "share-links.local.json");
    const configPath = join(tempRoot, "sing-box", "config.json");

    await writeFile(
      shareLinksPath,
      JSON.stringify(
        {
          listen: {
            host: "127.0.0.1",
            port: 7897
          },
          testUrl: "https://www.gstatic.com/generate_204",
          links: [
            {
              tag: "vless-a",
              url: "vless://uuid@example.com:443?type=tcp&security=reality&pbk=publickey&fp=chrome&sni=www.oracle.com&sid=ca#demo"
            },
            "trojan://password@example.com:443?security=reality&pbk=pub&fp=edge&sni=www.oracle.com&sid=01#trojan-b"
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const result = spawnSync(
      process.execPath,
      [join(repoRoot, "infra", "proxy", "build-sing-box-config.mjs")],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          HOST_PROXY_SHARE_LINKS_PATH: shareLinksPath,
          HOST_PROXY_CONFIG_PATH: configPath
        }
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), configPath);

    const writtenConfig = JSON.parse(await readFile(configPath, "utf8"));
    const autoOutbound = writtenConfig.outbounds.find(
      (outbound) => outbound.tag === "auto"
    );

    assert.equal(writtenConfig.inbounds[0].type, "mixed");
    assert.equal(writtenConfig.inbounds[0].listen_port, 7897);
    assert.equal(autoOutbound.type, "urltest");
    assert.deepEqual(autoOutbound.outbounds, ["vless-a", "trojan-b"]);
    assert.equal(writtenConfig.route.final, "auto");
  } finally {
    await rm(tempRoot, {
      force: true,
      recursive: true
    });
  }
});
