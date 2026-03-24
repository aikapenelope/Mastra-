FROM node:22-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build Mastra with Studio
COPY src ./src
COPY tsconfig.json ./
RUN npx mastra build --studio

# Alpine compatibility for native deps
RUN apk add --no-cache gcompat

# Run as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mastra -u 1001 && \
    chown -R mastra:nodejs /app
USER mastra

# Server configuration
ENV PORT=4111
ENV NODE_ENV=production
ENV MASTRA_STUDIO_PATH=.mastra/output/playground

EXPOSE 4111

CMD ["node", ".mastra/output/index.mjs"]
