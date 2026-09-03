# Third-party licenses

## Directory by 9d8

Portions of HiCyou are derived from the Directory project by 9d8.

MIT License

Copyright (c) 2024 9d8

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Geist fonts

`app/fonts/GeistVF.woff` and `app/fonts/GeistMonoVF.woff` are from the Geist
font project by Vercel and the Geist Project Authors. They remain licensed
under the SIL Open Font License 1.1 and are not relicensed under Apache-2.0.
The required copyright notice and full license are in [OFL-1.1.txt](OFL-1.1.txt).

## Screenshots

The screenshots in `docs/images/` document the hosted HiCyou interface and may
display third-party product names, logos, and preview images. Those marks and
images remain the property of their respective owners and are not licensed
under Apache-2.0.

## Installed packages and container images

JavaScript packages installed from `package.json` retain their own licenses.
They are dependencies and are not relicensed by this repository. Run
`bun pm licenses --prod` against the locked install to review the production
license inventory.

The locked production dependency graph includes permissive and notice-based
licenses, the MPL-2.0-licensed `@vercel/analytics` package, the CC-BY-4.0-
licensed `caniuse-lite` data package, and platform-specific LGPL-3.0-or-later
`@img/sharp-libvips-*` packages. Anyone distributing a prebuilt container or
other binary bundle must retain the license files shipped by those packages,
generate an SBOM for the exact artifact, and review the obligations that apply
to that distribution.
The public CI scans source and container artifacts for high/critical
vulnerabilities, embedded secrets, and filesystem misconfiguration; license
inventory output is reviewed separately rather than being treated as an
automatic legal conclusion.
