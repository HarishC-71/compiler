# Use official Ubuntu LTS as base
FROM ubuntu:24.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Update apt packages and install OpenJDK (Java 21) and Python 3
RUN apt-get update && apt-get install -y \
    openjdk-21-jdk-headless \
    python3 \
    python3-minimal \
    && rm -rf /var/lib/apt/lists/*

# Create security group and non-root user for code execution
RUN groupadd -r coderunner && useradd -r -g coderunner -m -s /sbin/nologin coderunner

# Setup dedicated writable workspace
RUN mkdir -p /code && chown coderunner:coderunner /code

WORKDIR /code

# Switch user to limit privileges
USER coderunner

# Sleep indefinitely to keep container alive for docker exec commands
CMD ["tail", "-f", "/dev/null"]
