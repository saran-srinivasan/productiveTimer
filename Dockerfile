# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json tsconfig*.json vite.config.js ./
RUN npm ci
COPY src/ ./src/
COPY index.html ./
RUN npm run build

# Stage 2: Build Rust Backend
FROM rust:1.80-slim-bullseye AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY backend/Cargo.toml backend/Cargo.lock* ./backend/
RUN mkdir -p backend/src && echo "fn main() {}" > backend/src/main.rs
RUN cd backend && cargo build --release || true
COPY backend/src ./backend/src
RUN cd backend && cargo build --release

# Stage 3: Runtime
FROM debian:bullseye-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=backend-builder /app/backend/target/release/productive-timer-backend /app/server
COPY --from=frontend-builder /app/dist /app/dist
RUN mkdir -p /app/data
ENV PORT=3001
ENV DATABASE_URL=sqlite:///app/data/productive_timer.db
EXPOSE 3001
CMD ["/app/server"]
