import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.exitCode = undefined;
  delete process.env["INPUT_DELETE-KEY"];
  delete process.env["INPUT_DELETE-DOCKER-CACHE"];
  delete process.env.BLACKSMITH_STICKYDISK_TOKEN;
  delete process.env.BLACKSMITH_BACKEND_URL;
  delete process.env.BLACKSMITH_ENV;
  delete process.env.GITHUB_REPOSITORY;
  delete process.env.GITHUB_REPO_NAME;
  delete process.env.BLACKSMITH_INSTALLATION_MODEL_ID;
  delete process.env.BLACKSMITH_REGION;
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("should error when both options are specified", async () => {
  process.env["INPUT_DELETE-KEY"] = "test-key";
  process.env["INPUT_DELETE-DOCKER-CACHE"] = "true";
  process.env.BLACKSMITH_STICKYDISK_TOKEN = "test-token";
  process.env.GITHUB_REPO_NAME = "org/repo";
  process.env.BLACKSMITH_INSTALLATION_MODEL_ID = "123";
  process.env.BLACKSMITH_REGION = "us-west-2";

  await import("./main.js");

  expect(process.exitCode).toBe(1);
});

it("should error when no options are specified", async () => {
  process.env.BLACKSMITH_STICKYDISK_TOKEN = "test-token";
  process.env.GITHUB_REPO_NAME = "org/repo";
  process.env.BLACKSMITH_INSTALLATION_MODEL_ID = "123";
  process.env.BLACKSMITH_REGION = "us-west-2";

  await import("./main.js");

  expect(process.exitCode).toBe(1);
});

it("should error when BLACKSMITH_STICKYDISK_TOKEN is missing", async () => {
  process.env["INPUT_DELETE-KEY"] = "test-key";
  process.env.GITHUB_REPO_NAME = "org/repo";
  process.env.BLACKSMITH_INSTALLATION_MODEL_ID = "123";
  process.env.BLACKSMITH_REGION = "us-west-2";

  await import("./main.js");

  expect(process.exitCode).toBe(1);
});

it("should error when GITHUB_REPO_NAME is missing", async () => {
  process.env["INPUT_DELETE-KEY"] = "test-key";
  process.env.BLACKSMITH_STICKYDISK_TOKEN = "test-token";
  process.env.BLACKSMITH_INSTALLATION_MODEL_ID = "123";
  process.env.BLACKSMITH_REGION = "us-west-2";

  await import("./main.js");

  expect(process.exitCode).toBe(1);
});

it("should error when BLACKSMITH_INSTALLATION_MODEL_ID is missing", async () => {
  process.env["INPUT_DELETE-KEY"] = "test-key";
  process.env.BLACKSMITH_STICKYDISK_TOKEN = "test-token";
  process.env.GITHUB_REPO_NAME = "org/repo";
  process.env.BLACKSMITH_REGION = "us-west-2";

  await import("./main.js");

  expect(process.exitCode).toBe(1);
});

it("should error when BLACKSMITH_REGION is missing", async () => {
  process.env["INPUT_DELETE-KEY"] = "test-key";
  process.env.BLACKSMITH_STICKYDISK_TOKEN = "test-token";
  process.env.GITHUB_REPO_NAME = "org/repo";
  process.env.BLACKSMITH_INSTALLATION_MODEL_ID = "123";

  await import("./main.js");

  expect(process.exitCode).toBe(1);
});

it("should handle delete-key option successfully", async () => {
  process.env["INPUT_DELETE-KEY"] = "test-key";
  process.env.BLACKSMITH_STICKYDISK_TOKEN = "test-token";
  process.env.GITHUB_REPO_NAME = "org/repo";
  process.env.BLACKSMITH_INSTALLATION_MODEL_ID = "123";
  process.env.BLACKSMITH_REGION = "us-west-2";

  // Mock fetch.
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        message: "Sticky disk deleted successfully",
        entity_id: "123",
      }),
  });

  await import("./main.js");

  expect(global.fetch).toHaveBeenCalledWith(
    "https://api.blacksmith.sh/stickydisks",
    expect.objectContaining({
      method: "DELETE",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repo_name: "org/repo",
        stickydisk_key: "test-key",
        installation_model_id: "123",
        region: "us-west-2",
        arch: "amd64",
        type: "stickydisk",
      }),
    }),
  );
  expect(process.exitCode).toBeUndefined();
});

it("should use staging URL when BLACKSMITH_ENV contains staging", async () => {
  process.env["INPUT_DELETE-KEY"] = "test-key";
  process.env.BLACKSMITH_STICKYDISK_TOKEN = "test-token";
  process.env.BLACKSMITH_ENV = "staging";
  process.env.GITHUB_REPO_NAME = "org/repo";
  process.env.BLACKSMITH_INSTALLATION_MODEL_ID = "123";
  process.env.BLACKSMITH_REGION = "us-west-2";

  // Mock fetch.
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        message: "Sticky disk deleted successfully",
        entity_id: "123",
      }),
  });

  await import("./main.js");

  expect(global.fetch).toHaveBeenCalledWith(
    "https://stagingapi.blacksmith.sh/stickydisks",
    expect.objectContaining({
      method: "DELETE",
    }),
  );
  expect(process.exitCode).toBeUndefined();
});

it("should use custom URL when BLACKSMITH_BACKEND_URL is set", async () => {
  process.env["INPUT_DELETE-KEY"] = "test-key";
  process.env.BLACKSMITH_STICKYDISK_TOKEN = "test-token";
  process.env.BLACKSMITH_BACKEND_URL = "https://custom.api.com";
  process.env.GITHUB_REPO_NAME = "org/repo";
  process.env.BLACKSMITH_INSTALLATION_MODEL_ID = "123";
  process.env.BLACKSMITH_REGION = "us-west-2";

  // Mock fetch.
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        message: "Sticky disk deleted successfully",
        entity_id: "123",
      }),
  });

  await import("./main.js");

  expect(global.fetch).toHaveBeenCalledWith(
    "https://custom.api.com/stickydisks",
    expect.objectContaining({
      method: "DELETE",
    }),
  );
  expect(process.exitCode).toBeUndefined();
});

it("should determine arm64 architecture when BLACKSMITH_ENV contains arm", async () => {
  process.env["INPUT_DELETE-KEY"] = "test-key";
  process.env.BLACKSMITH_STICKYDISK_TOKEN = "test-token";
  process.env.BLACKSMITH_ENV = "production-arm";
  process.env.GITHUB_REPO_NAME = "org/repo";
  process.env.BLACKSMITH_INSTALLATION_MODEL_ID = "123";
  process.env.BLACKSMITH_REGION = "us-west-2";

  // Mock fetch.
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        message: "Sticky disk deleted successfully",
        entity_id: "123",
      }),
  });

  await import("./main.js");

  expect(global.fetch).toHaveBeenCalledWith(
    "https://api.blacksmith.sh/stickydisks",
    expect.objectContaining({
      method: "DELETE",
      body: JSON.stringify({
        repo_name: "org/repo",
        stickydisk_key: "test-key",
        installation_model_id: "123",
        region: "us-west-2",
        arch: "arm64",
        type: "stickydisk",
      }),
    }),
  );
  expect(process.exitCode).toBeUndefined();
});

// Retry logic is tested in integration tests.
// Removing unit test due to async timing complexities with vitest.

it("should handle delete-key option with API error", async () => {
  process.env["INPUT_DELETE-KEY"] = "test-key";
  process.env.BLACKSMITH_STICKYDISK_TOKEN = "test-token";
  process.env.GITHUB_REPO_NAME = "org/repo";
  process.env.BLACKSMITH_INSTALLATION_MODEL_ID = "123";
  process.env.BLACKSMITH_REGION = "us-west-2";

  // Mock fetch with error response.
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    text: () => Promise.resolve("Sticky disk not found"),
  });

  await import("./main.js");

  expect(process.exitCode).toBe(1);
});

it("should handle delete-docker-cache option", async () => {
  process.env["INPUT_DELETE-DOCKER-CACHE"] = "true";
  process.env.BLACKSMITH_STICKYDISK_TOKEN = "test-token";
  process.env.GITHUB_REPO_NAME = "org/repo";
  process.env.BLACKSMITH_INSTALLATION_MODEL_ID = "123";
  process.env.BLACKSMITH_REGION = "us-west-2";

  // Mock fetch.
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        message: "Sticky disk deleted successfully",
        entity_id: "123",
      }),
  });

  await import("./main.js");

  expect(global.fetch).toHaveBeenCalledWith(
    "https://api.blacksmith.sh/stickydisks",
    expect.objectContaining({
      method: "DELETE",
      body: JSON.stringify({
        repo_name: "org/repo",
        stickydisk_key: "org/repo",
        installation_model_id: "123",
        region: "us-west-2",
        arch: "amd64",
        type: "dockerfile",
      }),
    }),
  );
  expect(process.exitCode).toBeUndefined();
});
