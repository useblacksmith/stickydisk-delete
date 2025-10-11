# stickydisk-delete

A GitHub Action for deleting sticky disks created by [useblacksmith/stickydisk](https://github.com/useblacksmith/stickydisk) in Blacksmith runners. This action provides cleanup capabilities for persistent storage volumes, helping you manage disk lifecycle and free up storage space in your workflows.

## Overview

`stickydisk-delete` is designed to work in conjunction with the `useblacksmith/stickydisk` action, which creates persistent storage volumes (sticky disks) that survive across workflow runs in Blacksmith environments. This delete action allows you to programmatically clean up these disks when they're no longer needed, preventing storage accumulation and managing costs.

## Features

- Delete sticky disks by name pattern
- Support for deleting multiple disks in a single action
- Automatic cleanup of unused cache storage
- Seamless integration with Blacksmith runners
- Simple and straightforward configuration

## Usage

### Basic Example

Delete a specific sticky disk:

```yaml
- name: Delete sticky disk
  uses: useblacksmith/stickydisk-delete@v1
  with:
    name: my-cache-disk
```

### Delete Multiple Disks

Delete multiple sticky disks using pattern matching:

```yaml
- name: Clean up test disks
  uses: useblacksmith/stickydisk-delete@v1
  with:
    name: test-disk-*
```

### Complete Workflow Example

Here's a complete example showing how to use sticky disks for caching and then clean them up:

```yaml
name: Build with Sticky Disk
on: push

jobs:
  build:
    runs-on: blacksmith-4vcpu-ubuntu-2204
    steps:
      - name: Create sticky disk for dependencies
        uses: useblacksmith/stickydisk@v1
        with:
          name: deps-cache
          size: 10GB

      - uses: actions/checkout@v4

      - name: Use cached dependencies
        run: |
          # Your build steps here using the sticky disk

  cleanup:
    runs-on: blacksmith-4vcpu-ubuntu-2204
    needs: build
    if: always()
    steps:
      - name: Delete sticky disk
        uses: useblacksmith/stickydisk-delete@v1
        with:
          name: deps-cache
```

## Inputs

| Input  | Description                                     | Required | Default |
| ------ | ----------------------------------------------- | -------- | ------- |
| `name` | Name or pattern of the sticky disk(s) to delete | Yes      | -       |

## How It Works

1. The action connects to the Blacksmith storage management system
2. Identifies sticky disks matching the provided name or pattern
3. Safely unmounts and deletes the specified disks
4. Cleans up associated metadata and cache entries

## When to Use

- **End of workflow cleanup**: Delete temporary sticky disks after your workflow completes
- **Scheduled maintenance**: Run periodic cleanup jobs to remove old or unused disks
- **Before creating new disks**: Clear existing disks before creating fresh ones
- **Cost management**: Remove large disks that are no longer needed to optimize storage costs

## Compatibility

This action is specifically designed for Blacksmith runners and requires:

- Blacksmith runner environment
- Prior creation of sticky disks using `useblacksmith/stickydisk`
- Appropriate permissions to manage storage resources

## Related Actions

- [useblacksmith/stickydisk](https://github.com/useblacksmith/stickydisk) - Create and mount sticky disks
- [useblacksmith/cache](https://github.com/useblacksmith/cache) - Alternative caching solution

## Support

For issues, feature requests, or questions, please open an issue in the [GitHub repository](https://github.com/useblacksmith/stickydisk-delete/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
