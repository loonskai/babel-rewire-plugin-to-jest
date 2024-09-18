import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ResolveFunctionAsync } from 'enhanced-resolve';
import { transform } from './transform.js';

export async function transformFile(fileRelativePath: string, webpackResolver: ResolveFunctionAsync) {
    try {
        const fileAbsolutePath = path.resolve(process.cwd(), fileRelativePath);
        const inputCode = await fs.readFile(fileAbsolutePath, { encoding: 'utf-8', flag: '' });
        const outputCode = transform(inputCode, fileAbsolutePath, webpackResolver);

        await fs.writeFile(path.resolve(process.cwd(), 'something.test.js'), outputCode);
    } catch (error) {
        console.error(`Error while transorming the file ${fileRelativePath}: ${error}`);
    }
}
