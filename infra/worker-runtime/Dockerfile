FROM mcr.microsoft.com/playwright:v1.58.2-jammy

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    fluxbox \
    novnc \
    websockify \
    x11vnc \
    xvfb \
  && rm -rf /var/lib/apt/lists/*

COPY start-worker-runtime.sh /usr/local/bin/start-worker-runtime.sh

RUN chmod +x /usr/local/bin/start-worker-runtime.sh

ENTRYPOINT ["/usr/local/bin/start-worker-runtime.sh"]
