import { getInput, logError, logInfo } from "gha-utils";

interface DeleteResponse {
  message: string;
  entity_id: string;
}

function getBlacksmithAPIUrl(): string {
  // Check for explicit URL override.
  if (process.env.BLACKSMITH_BACKEND_URL) {
    return process.env.BLACKSMITH_BACKEND_URL;
  }

  // Check environment for staging vs production.
  if (process.env.BLACKSMITH_ENV?.includes("staging")) {
    return "https://stagingapi.blacksmith.sh";
  }

  return "https://api.blacksmith.sh";
}

function getArchitecture(): string {
  // Determine architecture from BLACKSMITH_ENV.
  // If it includes "arm" it's arm64, otherwise amd64.
  if (process.env.BLACKSMITH_ENV?.includes("arm")) {
    return "arm64";
  }
  return "amd64";
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 5,
  initialBackoffMs = 200,
): Promise<T> {
  let lastError: Error = new Error("No error occurred");

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check for rate limiting or server errors.
      const errorWithStatus = error as Error & { status?: number };
      const shouldRetry =
        errorWithStatus.message.includes("429") ||
        errorWithStatus.status === 429 ||
        (errorWithStatus.status !== undefined && errorWithStatus.status >= 500);

      if (shouldRetry && attempt < maxRetries - 1) {
        const backoffMs = initialBackoffMs * Math.pow(2, attempt);
        logInfo(
          `Request failed (attempt ${String(attempt + 1)}/${String(maxRetries)}). Retrying in ${String(backoffMs)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

async function deleteStickyDiskByKey(
  stickyDiskKey: string,
  stickyDiskToken: string,
  repoName: string,
  installationModelId: string,
  region: string,
  type: string,
): Promise<void> {
  const apiUrl = getBlacksmithAPIUrl();
  const arch = getArchitecture();

  logInfo(`Using Blacksmith API URL: ${apiUrl}`);
  logInfo(`Deleting sticky disk with key: ${stickyDiskKey}`);
  logInfo(`Repository: ${repoName}`);
  logInfo(`Region: ${region}`);
  logInfo(`Architecture: ${arch}`);
  logInfo(`Type: ${type}`);

  const operation = async () => {
    const response = await fetch(`${apiUrl}/stickydisks`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${stickyDiskToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repo_name: repoName,
        stickydisk_key: stickyDiskKey,
        installation_model_id: installationModelId,
        region: region,
        arch: arch,
        type: type,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        `Failed to delete sticky disk: ${String(response.status)} - ${errorText}`,
      ) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    return response.json() as Promise<DeleteResponse>;
  };

  const result = await retryWithBackoff(operation);
  logInfo(`Successfully deleted sticky disk: ${result.message}`);
  logInfo(`Entity ID: ${result.entity_id}`);
}

async function main() {
  try {
    const deleteKey = getInput("delete-key");
    const deleteDockerCacheInput = getInput("delete-docker-cache");
    const deleteDockerCache = deleteDockerCacheInput === "true";

    // Validate that only one option is specified.
    if (deleteKey && deleteDockerCache) {
      throw new Error(
        "Only one of 'delete-key' or 'delete-docker-cache' can be specified",
      );
    }

    if (!deleteKey && !deleteDockerCache) {
      throw new Error(
        "Either 'delete-key' or 'delete-docker-cache' must be specified",
      );
    }

    // Get required environment variables - these should be set by the Blacksmith runner.
    const stickyDiskToken = process.env.BLACKSMITH_STICKYDISK_TOKEN;
    if (!stickyDiskToken) {
      throw new Error(
        "BLACKSMITH_STICKYDISK_TOKEN environment variable is required. This should be set by the Blacksmith runner.",
      );
    }

    const repoName =
      process.env.GITHUB_REPO_NAME ?? process.env.GITHUB_REPOSITORY;
    if (!repoName) {
      throw new Error(
        "GITHUB_REPO_NAME or GITHUB_REPOSITORY environment variable is required. This should be set by the Blacksmith runner or GitHub Actions.",
      );
    }

    const installationModelId = process.env.BLACKSMITH_INSTALLATION_MODEL_ID;
    if (!installationModelId) {
      throw new Error(
        "BLACKSMITH_INSTALLATION_MODEL_ID environment variable is required. This should be set by the Blacksmith runner.",
      );
    }

    const region = process.env.BLACKSMITH_REGION;
    if (!region) {
      throw new Error(
        "BLACKSMITH_REGION environment variable is required. This should be set by the Blacksmith runner.",
      );
    }

    // Handle delete-key option.
    if (deleteKey) {
      logInfo(`Deleting sticky disk with key: ${deleteKey}`);
      await deleteStickyDiskByKey(
        deleteKey,
        stickyDiskToken,
        repoName,
        installationModelId,
        region,
        "stickydisk", // Generic sticky disk type
      );
    }

    // Handle delete-docker-cache option.
    if (deleteDockerCache) {
      logInfo("Deleting Docker cache from sticky disk");
      // Use the repository name as the key for Docker cache.
      await deleteStickyDiskByKey(
        repoName,
        stickyDiskToken,
        repoName,
        installationModelId,
        region,
        "dockerfile", // Docker build cache type
      );
    }
  } catch (err) {
    logError(err);
    process.exitCode = 1;
  }
}

void main();
