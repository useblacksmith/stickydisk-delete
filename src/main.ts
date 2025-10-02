import { getInput, logError, logInfo } from "gha-utils";

interface DeleteResponse {
  stickydisk_entity_id: string;
  key: string;
  message: string;
}

function getBlacksmithAPIUrl(): string {
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

      // Check for rate limiting or server errors
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
  key: string,
  stickyDiskToken: string,
  repoName: string,
): Promise<void> {
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
      const error = new Error(
        `Failed to delete sticky disk: ${String(response.status)} - ${errorText}`,
      ) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    return response.json() as Promise<DeleteResponse>;
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
      throw new Error(
        "Only one of 'delete-key' or 'delete-docker-cache' can be specified",
      );
    }

    if (!deleteKey && !deleteDockerCache) {
      throw new Error(
        "Either 'delete-key' or 'delete-docker-cache' must be specified",
      );
    }

    // Get required environment variables - these should be set by the Blacksmith runner
    const stickyDiskToken = process.env.BLACKSMITH_STICKYDISK_TOKEN;
    if (!stickyDiskToken) {
      throw new Error(
        "BLACKSMITH_STICKYDISK_TOKEN environment variable is required. This should be set by the Blacksmith runner.",
      );
    }

    const repoName = process.env.GITHUB_REPOSITORY;
    if (!repoName) {
      throw new Error(
        "GITHUB_REPOSITORY environment variable is required. This should be set by GitHub Actions.",
      );
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
  } catch (err) {
    logError(err);
    process.exitCode = 1;
  }
}

void main();
