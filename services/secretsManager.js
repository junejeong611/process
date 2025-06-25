const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

// The name of the secret in AWS Secrets Manager.
const secretName = process.env.SECRET_NAME;
// The AWS region. Defaults to us-east-1 if not specified.
const region = process.env.AWS_REGION || 'us-east-1';

const client = new SecretsManagerClient({ region });

/**
 * Fetches secrets from AWS Secrets Manager and loads them into process.env.
 * The secret in AWS should be stored as a JSON object where keys are the
 * desired environment variable names (e.g., "EMAIL_HOST").
 */
async function loadSecrets() {
    if (!secretName) {
        return;
    }

    try {
        const command = new GetSecretValueCommand({ SecretId: secretName });
        const data = await client.send(command);

        if (data.SecretString) {
            const secrets = JSON.parse(data.SecretString);
            let keysLoaded = 0;
            for (const key in secrets) {
                if (Object.prototype.hasOwnProperty.call(secrets, key)) {
                    // Only set the environment variable if it's not already set.
                    // This allows for local overrides (e.g., in a .env file).
                    if (!process.env[key]) {
                        process.env[key] = secrets[key];
                        keysLoaded++;
                    }
                }
            }
        } else {
            // Throw the error to prevent the application from starting in a misconfigured state.
            throw new Error(`Failed to load secrets from AWS. Please check credentials and secret name. Secret value is binary, not a string.`);
        }
    } catch (err) {
        // Throw the error to prevent the application from starting in a misconfigured state.
        throw new Error(`Failed to load secrets from AWS. Please check credentials and secret name. Error: ${err.message}`);
    }
}

module.exports = { loadSecrets }; 