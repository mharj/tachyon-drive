# tachyon-drive-blob-storage

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![npm version](https://badge.fury.io/js/tachyon-drive-blob-storage.svg)](https://badge.fury.io/js/tachyon-drive-blob-storage)
[![Maintainability](https://qlty.sh/gh/mharj/projects/tachyon-drive/maintainability.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
[![Code Coverage](https://qlty.sh/gh/mharj/projects/tachyon-drive/coverage.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
![github action](https://github.com/mharj/tachyon-drive/actions/workflows/tachyon-drive-blob-storage.yml/badge.svg?branch=main)

## Azure Blob storage driver implementation

### Initialize simple JSON Azure Blob storage driver

```typescript
const blockBlobClient = BlobServiceClient.fromConnectionString(connectionString)
  .getContainerClient("container")
  .getBlockBlobClient("store.json");
const driver = new AzureBlobStorageDriver(
  "AzureBlobStorageDriver",
  { blockBlobClient },
  bufferSerializer
);
```

### Initialize crypt processor with JSON Azure Blob storage driver

```typescript
const blockBlobClient = BlobServiceClient.fromConnectionString(connectionString)
  .getContainerClient("container")
  .getBlockBlobClient("store.aes");
const processor = new CryptoBufferProcessor(Buffer.from("some-secret-key"));
const driver = new AzureBlobStorageDriver(
  "CryptAzureBlobStorageDriver",
  { blockBlobClient },
  bufferSerializer,
  processor
);
```

### see more on NPMJS [tachyon-drive](https://www.npmjs.com/package/tachyon-drive)
