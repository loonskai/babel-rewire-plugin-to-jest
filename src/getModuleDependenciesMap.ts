import fs from "node:fs";
import babel, { PluginObj } from "@babel/core";
import * as parser from "@babel/parser";
import recast from "recast";
import { CodemodPluginOptions } from "./codemodPlugin.js";

export interface DependencyInfo {
  path: string;
  isDefault: boolean;
  type: "imported" | "samefile";
}

export function getModuleDependenciesMap(
  moduleRelativePath: string,
  moduleFullPath: string
): Promise<Record<"imports" | "exports", Record<string, DependencyInfo>>> {
  const sourceCode = fs.readFileSync(moduleFullPath, "utf-8");
  const ast = recast.parse(sourceCode, {
    parser: {
      parse(source: string) {
        return parser.parse(source, {
          // filename,
          tokens: true,
          sourceType: "module",
          plugins: ["jsx", "flow"],
        });
      },
    },
  });
  const importsMap = {} as Record<string, DependencyInfo>;
  const exportsMap = {} as Record<string, DependencyInfo>;

  babel.transformFromAstSync(ast, sourceCode, {
    code: false,
    cloneInputAst: false,
    configFile: false,
    plugins: [
      function ({ types: t }: CodemodPluginOptions): PluginObj {
        return {
          visitor: {
            // Static imports
            ImportDeclaration(path) {
              const source = path.node.source.value;
              if (path.node.importKind === "type") return;
              path.node.specifiers.forEach((specifier) => {
                if (t.isImportDefaultSpecifier(specifier)) {
                  // Handle default imports
                  importsMap[specifier.local.name] = {
                    path: source,
                    isDefault: true,
                    type: "imported",
                  };
                } else if (t.isImportNamespaceSpecifier(specifier)) {
                  // Handle namespace imports
                  importsMap[specifier.local.name] = {
                    path: source,
                    isDefault: false,
                    type: "imported",
                  };
                } else if (
                  t.isImportSpecifier(specifier) &&
                  specifier.importKind !== "type"
                ) {
                  // Handle named imports
                  importsMap[specifier.local.name] = {
                    path: source,
                    isDefault: false,
                    type: "imported",
                  };
                }
              });
            },

            // Dynamic imports
            CallExpression(path) {
              if (t.isImport(path.node.callee)) {
                const dynamicImportPath = path?.node?.arguments?.[0]?.value;
                if (!dynamicImportPath) return;
                const parentPath = path.parentPath;
                if (t.isVariableDeclarator(parentPath.node)) {
                  const variableName =
                    parentPath.node.id.properties[0].key.name; // assuming destructuring assignment
                  importsMap[variableName] = {
                    path: dynamicImportPath,
                    isDefault: false,
                    type: "imported",
                  };
                }
              }
            },

            // Capture named exports
            ExportNamedDeclaration(path) {
              if (path.node.declaration) {
                // Direct named exports like `export const getName = () => 'Doe';`
                const declaration = path.node.declaration;

                // Handle function or variable declarations
                if (
                  t.isFunctionDeclaration(declaration) ||
                  t.isVariableDeclaration(declaration)
                ) {
                  declaration.declarations.forEach((decl) => {
                    const name = decl.id.name; // Get the function or variable name
                    exportsMap[name] = {
                      path: moduleRelativePath,
                      isDefault: false,
                      type: "samefile",
                    };
                  });
                } else if (t.isFunctionDeclaration(declaration)) {
                  const name = declaration.id.name; // Get the function name
                  exportsMap[name] = {
                    path: moduleRelativePath,
                    isDefault: false,
                    type: "samefile",
                  };
                }
              } else if (path.node.specifiers.length > 0) {
                // Handle exports like `export { foo } from './module';`
                path.node.specifiers.forEach((specifier) => {
                  const name = specifier.exported.name;
                  exportsMap[name] = {
                    path: moduleRelativePath,
                    isDefault: false,
                    type: "samefile",
                  };
                });
              }
            },

            // Capture default exports
            ExportDefaultDeclaration(path) {
              if (
                t.isFunctionDeclaration(path.node.declaration) ||
                t.isVariableDeclaration(path.node.declaration)
              ) {
                const name = path.node.declaration.id.name; // The function or variable name
                exportsMap[name] = {
                  path: moduleRelativePath,
                  isDefault: true,
                  type: "samefile",
                };
              }
            },
          },
        };
      },
    ],
  });
  return { imports: importsMap, exports: exportsMap };
}
