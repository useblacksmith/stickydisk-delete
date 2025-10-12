# stickydisk-delete

Delete sticky disks created by [useblacksmith/stickydisk](https://github.com/useblacksmith/stickydisk) in Blacksmith runners.

## Usage

This action supports two deletion methods:

### 1. Delete by Key

Delete a specific sticky disk using the key you provided when creating it:

```yaml
- name: Delete sticky disk
  uses: useblacksmith/stickydisk-delete@v1
  with:
    delete-key: my-cache-disk
```

### 2. Delete Docker Cache

Delete the Docker build cache for your repository. This should be used in conjunction with `useblacksmith/setup-docker-builder@v1`, which sets up the sticky disk for Docker build caching:

```yaml
- name: Delete Docker cache
  uses: useblacksmith/stickydisk-delete@v1
  with:
    delete-docker-cache: true
```

## Examples

### Cleanup After Build

```yaml
name: Build with Cleanup
on: push

jobs:
  build:
    runs-on: blacksmith-4vcpu-ubuntu-2204
    steps:
      - name: Create sticky disk for dependencies
        uses: useblacksmith/stickydisk@v1
        with:
          key: deps-cache
          path: ~/.npm

      - uses: actions/checkout@v4

      - name: Install and build
        run: |
          npm ci
          npm run build

  cleanup:
    runs-on: blacksmith-4vcpu-ubuntu-2204
    needs: build
    if: always()
    steps:
      - name: Delete sticky disk
        uses: useblacksmith/stickydisk-delete@v1
        with:
          delete-key: deps-cache
```

### Clean Docker Build Cache

Clean up Docker build cache that was created by `useblacksmith/setup-docker-builder@v1`:

```yaml
name: Clean Docker Cache
on: workflow_dispatch

jobs:
  clean-cache:
    runs-on: blacksmith-4vcpu-ubuntu-2204
    steps:
      - name: Delete Docker build cache
        uses: useblacksmith/stickydisk-delete@v1
        with:
          delete-docker-cache: true
```

## Inputs

| Input                 | Description                                | Required |
| --------------------- | ------------------------------------------ | -------- |
| `delete-key`          | Key of the sticky disk to delete           | No\*     |
| `delete-docker-cache` | Set to `true` to delete Docker build cache | No\*     |

\*One of `delete-key` or `delete-docker-cache` must be specified, but not both.

## Requirements

- Blacksmith runner environment
- Prior creation of sticky disks using `useblacksmith/stickydisk` (for key-based deletion)
- Docker builds on Blacksmith (for Docker cache deletion)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
