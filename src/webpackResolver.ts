import resolve, { ResolveFunction } from "enhanced-resolve";

export async function getWebpackResolver(
  configPath: string
): Promise<ResolveFunction> {
  const { default: webpackConfig } = await import(configPath);
  const config = webpackConfig({
    plugins: [],
  });
  return resolve.create.sync({
    extensions: config.resolve.extensions,
    alias: config.resolve.alias,
    modules: config.resolve.modules,
    mainFiles: config.resolve.mainFiles,
  });
}
