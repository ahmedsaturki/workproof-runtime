FROM node:24-bookworm-slim AS build

ARG VERSION=dev
ARG VCS_REF=unknown

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY apps ./apps
COPY packages ./packages
COPY lab ./lab
COPY test ./test
COPY types ./types
COPY scripts ./scripts

RUN npm install
RUN npm run build

FROM node:24-bookworm-slim

ARG VERSION=dev
ARG VCS_REF=unknown

LABEL org.opencontainers.image.title="WorkProof Runtime"
LABEL org.opencontainers.image.description="Outcome-first digital work runtime"
LABEL org.opencontainers.image.version="$VERSION"
LABEL org.opencontainers.image.revision="$VCS_REF"
LABEL org.opencontainers.image.source="https://github.com/ahmedsaturki/workproof-runtime"

WORKDIR /app

ENV NODE_ENV=production     HOST=0.0.0.0     PORT=8788     WORK_DIRECTORY=/data/work-runs

COPY --from=build /app/package.json ./package.json
COPY README.md LICENSE ./
COPY --from=build /app/dist ./dist

RUN useradd --system --create-home --uid 10001 workproof     && mkdir -p /data/work-runs     && chown -R workproof:workproof /app /data

USER workproof

VOLUME ["/data"]
EXPOSE 8788

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5   CMD node -e "fetch('http://127.0.0.1:8788/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "node dist/apps/studio.js \"$WORK_DIRECTORY\" \"$PORT\" \"$HOST\""]
