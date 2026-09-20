# ---- Build stage ----
FROM node:20-bullseye AS build
WORKDIR /app

# Install all deps (including dev) for the TypeScript build.
COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune to production dependencies for the runtime image.
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# ROLE selects which process to run: "api" (default) or "worker".
ENV ROLE=api
EXPOSE 3000

# Start the API server or the Temporal worker based on ROLE.
CMD ["sh", "-c", "if [ \"$ROLE\" = \"worker\" ]; then node dist/temporal/worker.js; else node dist/api/server.js; fi"]
