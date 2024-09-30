import path from "node:path";
import { PluginObj, types as t, template } from "@babel/core";
import { ResolveFunction } from "enhanced-resolve";
import { getModuleDependenciesMap } from "./getModuleDependenciesMap.js";

const ROOT_PATH = path.resolve(process.cwd(), "./src");
const REWIRE_CONSTANTS = {
  __RewireAPI__: "__RewireAPI__",
};

function resolveModulePath(
  filePath: string,
  resolver: ResolveFunction,
  importPath: string
): string {
  const contextPath = path.isAbsolute(importPath)
    ? ROOT_PATH
    : path.dirname(filePath);
  const fullPath = resolver(contextPath, importPath);
  if (!fullPath) {
    throw new Error(`Cannot resolve full path for ${fullPath}: no full path`);
  }
  return fullPath;
}

export interface CodemodPluginOptions {
  types: typeof t;
  template: typeof template;
}

export function getCodemodPlugin(
  sourceCode: string,
  filePath: string,
  resolver: ResolveFunction
) {
  return function codemodPlugin({
    types: t,
    template,
  }: CodemodPluginOptions): PluginObj {
    let topDescribePath = null;
    return {
      visitor: {
        ImportDeclaration(path) {
          if (
            !path.node.specifiers.some(
              (specifier) =>
                specifier.local.name === REWIRE_CONSTANTS.__RewireAPI__
            )
          ) {
            return;
          }

          const mockedModulePath = path.node.source.value;
          const moduleFullPath = resolveModulePath(
            filePath,
            resolver,
            mockedModulePath
          );
          const moduleDependenciesMap = getModuleDependenciesMap(
            mockedModulePath,
            moduleFullPath
          );
          console.log("moduleDependenciesMap", moduleDependenciesMap);

          const { referencePaths = [] } =
            path.scope.getBinding(REWIRE_CONSTANTS.__RewireAPI__) || {};
          referencePaths.forEach((refPath) => {
            let path = refPath;
            while (!t.isCallExpression(path.node)) {
              path = path.parentPath!;
            }
            // @ts-expect-error TODO: Check babel types
            switch (path.node.callee.property.name) {
              case "__Rewire__": {
                const [fnName, fnValue] = path.node.arguments;
                const dependencyModuleInfo =
                  moduleDependenciesMap.imports[fnName.value] ||
                  moduleDependenciesMap.exports[fnName.value];
                if (!dependencyModuleInfo) {
                  console.log(
                    "Cannot find export or import - manual resolution needed:",
                    fnName
                  );
                  return;
                }
                const jestModuleMockAST = buildJestMockedModuleAST({
                  template,
                  dependencyModuleInfo,
                  name: fnName.value,
                });
                // TODO:
                // 1: Find top descrive path
                // 2. Check for existing jest.mock(dependencyModuleInfo.path) instead of creating a new one each time
                // if (topDescribePath) {
                // THIS MUST ALWAYS EXECUTE
                path.insertBefore(jestModuleMockAST);
                // }
                const nodeAsString = getNodeAsString(sourceCode, fnValue);
                path.replaceWith(
                  // @ts-expect-error TODO: Check babel types
                  template.ast`${fnName.value}.mockImplementation(${nodeAsString})`
                );
                break;
              }
              case "__ResetDependency__": {
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
          if (t.isIdentifier(callee, { name: "describe" })) {
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
