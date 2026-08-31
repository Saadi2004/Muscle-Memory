# ==========================================================
# Multi-Stage Production Dockerfile for Muscle Memory
# Builds React Frontend + FastAPI Backend for Google Cloud Run
# ==========================================================

# --- Stage 1: Build the React 19 Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build the Python 3.11 Backend & Serve Single Container ---
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app/ ./app/

# Copy compiled frontend assets from Stage 1 into /app/static
COPY --from=frontend-builder /frontend/dist ./static/

EXPOSE 8080

# Launch FastAPI on Google Cloud Run dynamic port
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
