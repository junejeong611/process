#!/bin/bash

# Step 1: Fetch secrets from AWS Secrets Manager
SECRET_NAME=process-it/dev/secrets   # <-- Replace with your actual secret name
AWS_REGION=us-east-1          # <-- Replace with your AWS region

SECRETS_JSON=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region "$AWS_REGION" --query SecretString --output text)

# Step 2: Write secrets to .env file
cat > .env <<EOL
STRIPE_SECRET_KEY=$(echo $SECRETS_JSON | jq -r .STRIPE_SECRET_KEY)
STRIPE_PUBLISHABLE_KEY=$(echo $SECRETS_JSON | jq -r .STRIPE_PUBLISHABLE_KEY)
STRIPE_WEBHOOK_SECRET=$(echo $SECRETS_JSON | jq -r .STRIPE_WEBHOOK_SECRET)
STRIPE_PRICE_ID=$(echo $SECRETS_JSON | jq -r .STRIPE_PRICE_ID)
CLIENT_URL=$(echo $SECRETS_JSON | jq -r .CLIENT_URL)
EOL

echo ".env file created from AWS Secrets Manager"

# Step 3: Run Docker Compose
docker compose up --build
