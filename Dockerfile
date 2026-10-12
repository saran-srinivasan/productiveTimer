# syntax=docker/dockerfile:1

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json tsconfig*.json vite.config.js ./
RUN npm ci
COPY src/ ./src/
COPY index.html ./
RUN npm run build

# Stage 2: Prepare Cargo recipe with cargo-chef
FROM lukemathwalker/cargo-chef:latest-rust-1-bookworm AS chef
WORKDIR /app

FROM chef AS planner
COPY backend/ ./backend/
RUN cd backend && cargo chef prepare --recipe-path recipe.json

# Stage 3: Build Rust Backend
FROM chef AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY --from=planner /app/backend/recipe.json ./backend/recipe.json

# Build dependencies - cached by Docker until Cargo.toml or Cargo.lock change
RUN cd backend && cargo chef cook --release --recipe-path recipe.json

# Copy full backend source code & migrations (embedded at compile time by sqlx::migrate!)
COPY backend/ ./backend/
RUN cd backend && cargo build --release

# Stage 4: Runtime
FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=backend-builder /app/backend/target/release/productive-timer-backend /app/server
COPY --from=frontend-builder /app/dist /app/dist
RUN mkdir -p /app/data
ENV PORT=3001
ENV DATABASE_URL=sqlite:///app/data/productive_timer.db
EXPOSE 3001
CMD ["/app/server"]
