# syntax=docker/dockerfile:1

# The site is built with the Bun the project is locked to, in mise.lock.
FROM oven/bun:1.4.2 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY packages/core/package.json packages/core/
COPY packages/belsize/package.json packages/belsize/
COPY packages/jorjorwel/package.json packages/jorjorwel/
COPY packages/memetics/package.json packages/memetics/
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# The server runs from only the built site, with no source, no packages, no shell, and not as root.
FROM oven/bun:1.4.2-distroless
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts/preview.ts ./scripts/preview.ts
ENV HOST=0.0.0.0 PORT=8080
EXPOSE 8080
USER nonroot
ENTRYPOINT ["bun", "scripts/preview.ts"]
