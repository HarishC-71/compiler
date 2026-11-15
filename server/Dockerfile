# Production Dockerfile for Online Compiler Backend on Render
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install curl, Python 3, and OpenJDK 21
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    openjdk-21-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install server dependencies
COPY package*.json ./
RUN npm install --production

COPY . .

ENV PORT=3001
ENV EXECUTION_MODE=local

EXPOSE 3001

CMD ["node", "server.js"]
