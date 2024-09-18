

## Arguments

| Argument         | Alias | Description                                 | Required | Example                           |
|------------------|-------|---------------------------------------------|----------|-----------------------------------|
| `--webpackConfig`| `-w`  | Path to the Webpack configuration file (used for module resolution)|  Yes      | `--webpackConfig ./webpack.config.js` |
| `--files`        | `-f`  | A file containing the list of test files to convert                | Yes      | `--files ./src/index.js`          |

### Example Usage

```bash
npx --registry=https://registry.npmjs.org babel-rewire-plugin-to-jest --webpackConfig ./conf/webpack/webpack.base.js --files ./files_with_rewireapi.txt
