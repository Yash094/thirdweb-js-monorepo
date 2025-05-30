# @thirdweb-dev/insight

## 1.0.0

### Major Changes

- [#6706](https://github.com/thirdweb-dev/js/pull/6706) [`185d2f3`](https://github.com/thirdweb-dev/js/commit/185d2f309c349e37ac84bd3a2ce5a1c9c7011083) Thanks [@joaquim-verges](https://github.com/joaquim-verges)! - Initial release of dedicated insight TS sdk

  This package is a thin openAPI wrapper for insight, our in-house indexer.

  ## Configuration

  ```ts
  import { configure } from "@thirdweb-dev/insight";

  // call this once at the startup of your application
  configure({
    clientId: "<YOUR_CLIENT_ID>",
  });
  ```

  ## Example Usage

  ```ts
  import { getV1Events } from "@thirdweb-dev/insight";

  const events = await getV1Events({
    query: {
      chain: [1, 137],
      filter_address: "0x1234567890123456789012345678901234567890",
    },
  });
  ```
