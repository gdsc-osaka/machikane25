Firebase App Hosting が monorepo に対応していないため, 共通ライブラリは packages/ ディレクトリにコピーする.
要修正.

```json
{
  "dependencies": {
    "@machikane25/logger": "workspace:*"
  }
}
```