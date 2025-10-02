import 'node:fs';
import 'node:fs/promises';
import os from 'node:os';
import 'node:path';

/**
 * Retrieves the value of a GitHub Actions input.
 *
 * @param name - The name of the GitHub Actions input.
 * @returns The value of the GitHub Actions input, or an empty string if not found.
 */
function getInput(name) {
    const value = process.env[`INPUT_${name.toUpperCase()}`] ?? "";
    return value.trim();
}

/**
 * Logs an information message in GitHub Actions.
 *
 * @param message - The information message to log.
 */
function logInfo(message) {
    process.stdout.write(`${message}${os.EOL}`);
}
/**
 * Logs an error message in GitHub Actions.
 *
 * @param err - The error, which can be of any type.
 */
function logError(err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stdout.write(`::error::${message}${os.EOL}`);
}

function getBlacksmithAPIUrl() {
    // Check for explicit URL override
    if (process.env.BLACKSMITH_BACKEND_URL) {
        return process.env.BLACKSMITH_BACKEND_URL;
    }
    // Check environment for staging vs production
    if (process.env.BLACKSMITH_ENV?.includes("staging")) {
        return "https://stagingapi.blacksmith.sh";
    }
    return "https://api.blacksmith.sh";
}
async function retryWithBackoff(operation, maxRetries = 5, initialBackoffMs = 200) {
    let lastError = new Error("No error occurred");
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            // Check for rate limiting or server errors
            const errorWithStatus = error;
            const shouldRetry = errorWithStatus.message.includes("429") ||
                errorWithStatus.status === 429 ||
                (errorWithStatus.status !== undefined && errorWithStatus.status >= 500);
            if (shouldRetry && attempt < maxRetries - 1) {
                const backoffMs = initialBackoffMs * Math.pow(2, attempt);
                logInfo(`Request failed (attempt ${String(attempt + 1)}/${String(maxRetries)}). Retrying in ${String(backoffMs)}ms...`);
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}
async function deleteStickyDiskByKey(key, stickyDiskToken, repoName) {
    const apiUrl = getBlacksmithAPIUrl();
    logInfo(`Using Blacksmith API URL: ${apiUrl}`);
    const operation = async () => {
        const response = await fetch(`${apiUrl}/stickydisks/cache/by-key`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${stickyDiskToken}`,
                "X-Github-Repo-Name": repoName,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ key }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`Failed to delete sticky disk: ${String(response.status)} - ${errorText}`);
            error.status = response.status;
            throw error;
        }
        return response.json();
    };
    const result = await retryWithBackoff(operation);
    logInfo(`Successfully deleted sticky disk cache for key: ${key}`);
    logInfo(`Entity ID: ${result.stickydisk_entity_id}`);
}
async function main() {
    try {
        const deleteKey = getInput("delete-key");
        const deleteDockerCacheInput = getInput("delete-docker-cache");
        const deleteDockerCache = deleteDockerCacheInput === "true";
        // Validate that only one option is specified
        if (deleteKey && deleteDockerCache) {
            throw new Error("Only one of 'delete-key' or 'delete-docker-cache' can be specified");
        }
        if (!deleteKey && !deleteDockerCache) {
            throw new Error("Either 'delete-key' or 'delete-docker-cache' must be specified");
        }
        // Get required environment variables - these should be set by the Blacksmith runner
        const stickyDiskToken = process.env.BLACKSMITH_STICKYDISK_TOKEN;
        if (!stickyDiskToken) {
            throw new Error("BLACKSMITH_STICKYDISK_TOKEN environment variable is required. This should be set by the Blacksmith runner.");
        }
        const repoName = process.env.GITHUB_REPOSITORY;
        if (!repoName) {
            throw new Error("GITHUB_REPOSITORY environment variable is required. This should be set by GitHub Actions.");
        }
        // Handle delete-key option
        if (deleteKey) {
            logInfo(`Deleting sticky disk with key: ${deleteKey}`);
            await deleteStickyDiskByKey(deleteKey, stickyDiskToken, repoName);
        }
        // Handle delete-docker-cache option
        if (deleteDockerCache) {
            logInfo("Deleting Docker cache from sticky disk");
            // TODO: Implement delete-docker-cache logic
        }
    }
    catch (err) {
        logError(err);
        process.exitCode = 1;
    }
}
void main();
