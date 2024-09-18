import { promises as fs } from 'node:fs';
import path from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { transformFile } from './transformFile.js';
import { getWebpackResolver } from './webpackResolver.js';

const argv = await yargs(hideBin(process.argv))
    .option('webpackConfig', {
        alias: 'w',
        describe: 'Path to the Webpack configuration file (used for module resolution)',
        type: 'string',
        demandOption: true,
    })
    .option('files', {
        alias: 'f',
        describe: 'A file containing the list of test files to convert',
        type: 'string',
        demandOption: true,
    })
    .help().argv;

async function processFiles(filesPath: string) {
    try {
        const absolutePath = path.resolve(process.cwd(), filesPath);
        const filesContent = await fs.readFile(absolutePath, 'utf-8');
        const paths = filesContent.split('/\r?\n/');
        const webpackConfigPath = path.resolve(process.cwd(), argv.webpackConfig);
        const webpackResolver = await getWebpackResolver(webpackConfigPath);

        for await (const testFilePath of paths) {
            const trimmedTestFilePath = testFilePath.trim();
            if (trimmedTestFilePath) {
                console.log(`Processing file: ${testFilePath}`);
                await transformFile(trimmedTestFilePath, webpackResolver);
            }
        }

        console.log('Finished Codemon run');
    } catch (error) {
        console.error(`Error processing files: ${error}`);
    }
}

processFiles(argv.files);
