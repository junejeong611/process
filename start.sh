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
ENCRYPTION_SECRET=$(echo $SECRETS_JSON | jq -r .ENCRYPTION_SECRET)
MONGODB_URI=$(echo $SECRETS_JSON | jq -r .MONGODB_URI)
EMAIL_USER=$(echo $SECRETS_JSON | jq -r .EMAIL_USER)
EMAIL_PASS=$(echo $SECRETS_JSON | jq -r .EMAIL_PASS)
EMAIL_FROM=$(echo $SECRETS_JSON | jq -r .EMAIL_FROM)
EMAIL_HOST=$(echo $SECRETS_JSON | jq -r .EMAIL_HOST)
EMAIL_PORT=$(echo $SECRETS_JSON | jq -r .EMAIL_PORT)
EMAIL_SERVICE=$(echo $SECRETS_JSON | jq -r .EMAIL_SERVICE)
JWT_SECRET=$(echo $SECRETS_JSON | jq -r .JWT_SECRET)
COOKIE_SECRET=$(echo $SECRETS_JSON | jq -r .COOKIE_SECRET)
EOL

echo ".env file created from AWS Secrets Manager"

# Step 3: Run Docker Compose
docker compose up --build