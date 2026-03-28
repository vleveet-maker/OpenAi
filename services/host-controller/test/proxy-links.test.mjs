import test from "node:test";
import assert from "node:assert/strict";

import { buildSingBoxConfig, parseProxyShareLink } from "../src/proxy-links.mjs";

test("parses vless, shadowsocks, and trojan share links", () => {
  const vless = parseProxyShareLink({
    tag: "vless-a",
    url: "vless://uuid@example.com:443?type=tcp&security=reality&pbk=publickey&fp=chrome&sni=www.oracle.com&sid=ca#demo"
  }, 0);
  const shadowsocks = parseProxyShareLink({
    tag: "ss-a",
    url: "ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@example.com:8388?type=tcp#demo"
  }, 1);
  const trojan = parseProxyShareLink({
    tag: "trojan-a",
    url: "trojan://password@example.com:443?security=reality&pbk=pub&fp=edge&sni=www.oracle.com&sid=01#demo"
  }, 2);

  assert.equal(vless.type, "vless");
  assert.equal(vless.tls.reality.public_key, "publickey");
  assert.equal(shadowsocks.type, "shadowsocks");
  assert.equal(shadowsocks.method, "aes-128-gcm");
  assert.equal(trojan.type, "trojan");
  assert.equal(trojan.tls.utls.fingerprint, "edge");
});

test("builds a sing-box urltest config with auto failover", () => {
  const config = buildSingBoxConfig({
    listenHost: "127.0.0.1",
    listenPort: 7897,
    testUrl: "https://www.gstatic.com/generate_204",
    links: [
      {
        type: "vless",
        tag: "proxy-a",
        server: "one.example.com",
        server_port: 443,
        uuid: "uuid",
        network: "tcp",
        tls: {
          enabled: true,
          server_name: "www.oracle.com",
          utls: {
            enabled: true,
            fingerprint: "chrome"
          },
          reality: {
            enabled: true,
            public_key: "pub",
            short_id: "ca"
          }
        }
      }
    ]
  });

  assert.equal(config.inbounds[0].type, "mixed");
  assert.equal(config.outbounds[1].type, "urltest");
  assert.deepEqual(config.outbounds[1].outbounds, ["proxy-a"]);
  assert.equal(config.route.final, "auto");
});
