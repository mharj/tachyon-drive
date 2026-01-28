# tachyon-drive-browser

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![npm version](https://badge.fury.io/js/tachyon-drive-browser.svg)](https://badge.fury.io/js/tachyon-drive-browser)
[![Maintainability](https://qlty.sh/gh/mharj/projects/tachyon-drive/maintainability.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
[![Code Coverage](https://qlty.sh/gh/mharj/projects/tachyon-drive/coverage.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
![github action](https://github.com/mharj/tachyon-drive/actions/workflows/tachyon-drive-browser.yml/badge.svg?branch=main)

## Browser CacheStorage and LocalStorage driver for [tachyon-drive](https://www.npmjs.com/package/tachyon-drive)

### Compatibility

- Uses `CacheStorage` and `LocalStorage` Browser APIs.
- Have peer dependencies on Browserify `events` packages (for StorageDriver `EventEmitter`).

### CacheStorageDriver and LocalStorageDriver examples

```typescript
export type DemoData = z.infer<typeof dataSchema>;
const stringSerializer: IPersistSerializer<DemoData, string> = {
  name: "stringSerializer",
  serialize: (data: DemoData) => JSON.stringify(data),
  deserialize: (buffer: string) => JSON.parse(buffer),
  validator: (data: DemoData) => dataSchema.safeParse(data).success,
};
const arrayBufferSerializer: IPersistSerializer<DemoData, ArrayBuffer> = {
  name: "arrayBufferSerializer",
  serialize: (data: DemoData) => new TextEncoder().encode(JSON.stringify(data)),
  deserialize: (buffer: ArrayBuffer) =>
    JSON.parse(new TextDecoder().decode(buffer)),
  validator: (data: DemoData) => dataSchema.safeParse(data).success,
};

// local storage driver allows only string values.
export const localStoreDriver = new LocalStorageDriver(
  "LocalStorageDriver",
  "tachyon",
  stringSerializer,
  undefined,
  console,
);
// cache storage driver can handle string and array buffer values.
export const cacheStoreDriver = new CacheStorageDriver(
  {
    name: "CacheStorageDriver",
    cache: window.caches.open("test-cache"),
    url: new URL("https://example.com/data"),
  },
  stringSerializer,
  undefined,
  console,
);
export const cacheStoreDriver = new CacheStorageDriver(
  {
    name: "CacheStorageDriver",
    cache: window.caches.open("test-cache"),
    url: new URL("http://tachyon"),
  },
  arrayBufferSerializer,
  undefined,
  console,
);
// WebFS Api driver
async function getFileHandle() {
  return (await navigator.storage.getDirectory()).getFileHandle("test.file", {
    create: true,
  });
}
export const webFsStoreDriver = new WebFsStorageDriver(
  { name: "WebFsStorageDriver", fileHandle: getFileHandle },
  arrayBufferSerializer,
);
// encrypted cache storage (ArrayBuffer)
const processor = new CryptoBufferProcessor(() =>
  new TextEncoder().encode("some-secret-key"),
);
export const cacheStoreDriver = new CacheStorageDriver(
  {
    name: "CacheStorageDriver",
    cache: window.caches.open("test-cache"),
    url: new URL("http://tachyon"),
    logger: console,
  },
  arrayBufferSerializer,
  processor,
);
export const webFsStoreDriver = new WebFsStorageDriver(
  {
    name: "WebFsStorageDriver",
    fileHandle: getFileHandle,
    logger: console,
  },
  arrayBufferSerializer,
  processor,
);
```

### see more on NPMJS [tachyon-drive](https://www.npmjs.com/package/tachyon-drive)
