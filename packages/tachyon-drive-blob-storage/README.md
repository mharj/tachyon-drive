# tachyon-drive-blob-storage

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
