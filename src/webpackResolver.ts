import resolve from 'enhanced-resolve';

export async function getWebpackResolver(configPath: string) {
    const { default: webpackConfig } = await import(configPath);
    const config = webpackConfig({
        plugins: [],
    });
    return resolve.create({
        extensions: config.resolve.extensions,
        alias: config.resolve.alias,
        modules: config.resolve.modules,
        mainFiles: config.resolve.mainFiles,
    });
}
