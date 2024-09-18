import path from 'node:path';
import { PluginObj } from '@babel/core';
import * as t from '@babel/types';
import template from '@babel/template';
import { ResolveFunctionAsync } from 'enhanced-resolve';
import { getModuleDependenciesMap } from './getModuleDependenciesMap.js';

const ROOT_PATH = path.resolve(process.cwd(), './src');
const REWIRE_CONSTANTS = {
    __RewireAPI__: '__RewireAPI__',
};

function resolveModulePath(filePath: string, resolver: ResolveFunctionAsync, importPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const contextPath = path.isAbsolute(importPath) ? ROOT_PATH : path.dirname(filePath);
        resolver(contextPath, importPath, (err, fullPath) => {
            if (err || !fullPath) {
                return reject(err);
            }
            resolve(fullPath);
        });
    });
}

export interface CodemonPluginOptions {
    types: typeof t;
    template: typeof template;
}

export function getCodemonPlugin(sourceCode: string, filePath: string, resolver: ResolveFunctionAsync) {
    return function codemonPlugin({ types: t, template }: CodemonPluginOptions): PluginObj {
        let topDescribePath = null;
        return {
            visitor: {
                async ImportDeclaration(path) {
                    if (
                        !path.node.specifiers.some(specifier => specifier.local.name === REWIRE_CONSTANTS.__RewireAPI__)
                    ) {
                        return;
                    }

                    const mockedModulePath = path.node.source.value;
                    const moduleFullPath = await resolveModulePath(filePath, resolver, mockedModulePath);
                    const moduleDependenciesMap = await getModuleDependenciesMap(mockedModulePath, moduleFullPath);

                    const { referencePaths = [] } = path.scope.getBinding(REWIRE_CONSTANTS.__RewireAPI__) || {};
                    referencePaths.forEach(refPath => {
                        let path = refPath;
                        while (!t.isCallExpression(path.node)) {
                            path = path.parentPath!;
                        }
                        // @ts-expect-error TODO: Check babel types
                        switch (path.node.callee.property.name) {
                            case '__Rewire__': {
                                const [fnName, fnValue] = path.node.arguments;
                                const dependencyModuleInfo =
                                    moduleDependenciesMap.imports[fnName.value] ||
                                    moduleDependenciesMap.exports[fnName.value];
                                if (!dependencyModuleInfo) {
                                    // CAN'T FIND EXPORT OR IMPORT - MANUAL RESOLUTION NEEDED
                                    return;
                                }
                                const jestModuleMockAST = buildJestMockedModuleAST({
                                    template,
                                    dependencyModuleInfo,
                                    name: fnName.value,
                                });
                                if (topDescribePath) {
                                    // THIS MUST ALWAYS EXECUTE
                                    topDescribePath.insertBefore(jestModuleMockAST);
                                }
                                const nodeAsString = getNodeAsString(sourceCode, fnValue);
                                path.replaceWith(
                                    // @ts-expect-error TODO: Check babel types
                                    template.ast`${fnName.value}.mockImplementation(${nodeAsString})`,
                                );
                                break;
                            }
                            case '__ResetDependency__': {
                                // @ts-expect-error TODO: Check babel types
                                const fnName = path.node.arguments[0].value;
                                // @ts-expect-error TODO: Check babel types
                                path.replaceWith(template.ast`${fnName}.mockReset();`);
                                break;
                            }
                        }
                    });
                },
                CallExpression(path) {
                    if (topDescribePath) return;
                    const callee = path.node.callee;
                    // Check if the function called is "describe"
                    if (t.isIdentifier(callee, { name: 'describe' })) {
                        topDescribePath = path;
                    }
                },
            },
        };
    };
}

function getNodeAsString(source: string, node: t.Node): string {
    return source.slice(node.start!, node.end!);
}

function buildJestMockedModuleAST({ template, dependencyModuleInfo, name }) {
    return template.ast`
        jest.mock('${dependencyModuleInfo.path}', () => ({
            ...jest.requireActual('${dependencyModuleInfo.path}'),
            ${name}: jest.fn(),
        }));`;
}
