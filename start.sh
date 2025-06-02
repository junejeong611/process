#!/bin/bash

# Step 1: Copy .env.example to .env
cp .env.example .env
echo ".env file created from .env.example"

# Step 2: Run Docker Compose
docker compose up --build
