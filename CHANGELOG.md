# Changelog

## 2.0.0

- Updated the public core to Next.js 16 and React 19.
- Standardized the product name as HiCyou and refreshed the About page and README with the current stack and feature set.
- Added multilingual discovery, submissions, administration, public API, webhooks, tests, and Docker support.
- Replaced the legacy license terms with Apache-2.0 while retaining the upstream 9d8 MIT notice.
- Made “Powered by HiCyou” an optional, recommended attribution.
- Excluded production data, partner adapters, private deployment configuration, and internal development records.
- Pinned validated DNS addresses through outbound HTTP connections to prevent DNS-rebinding SSRF, tightened browser and repository security controls, and pinned build images to reviewed digests.
