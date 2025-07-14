#!/bin/bash

# Simple startup script: copy .env.example to .env
cp .env.example .env

echo ".env file created from .env.example"

docker compose up --build