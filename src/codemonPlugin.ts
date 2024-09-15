import { PluginObj } from "@babel/core";
import * as t from "@babel/types";
import template from "@babel/template";

// function getVisitor() {
//   const __Rewire__StatementVisitor = {
//     CallExpression(path: any) {
//       switch (path.node.callee.property.name) {
//         case "withArgs": {
//           console.log("withArgs", path);
//           const args = path.node.arguments;
//           const fn = template.statement(
//             "expect().toHaveBeenCalledWith(%%args%%)"
//           );
//           const ast = fn({ args });
//           const expectNode = template.statement(
//             `expect().toHaveBeenCalledWith()`
//           );
//           break;
//         }
//         case "returns": {
//           // console.log('returns', path);
//           break;
//         }
//         case "mock": {
//           // console.log('mock', path);
//           break;
//         }
//       }
//     },
//   };

//   return {
//     visitor: {
//       ImportDeclaration(path) {
//         const { referencePaths } = path.scope.getBinding("__RewireAPI__");
//         referencePaths.forEach((refPath) => {
//           switch (refPath.parent.property.name) {
//             case "__RewireAPI__": {
//               const expressionStatementPath = refPath.parentPath.parentPath;
//               expressionStatementPath.traverse(__Rewire__StatementVisitor);
//               break;
//             }
//             case "__ResetDependency__": {
//               break;
//             }
//           }
//         });
//       },
//     },
//   };
// }

// path.replaceWith(template.ast`
//   jest.mock('${modulePath}', () => ({
//     ...jest.requireActual('${modulePath}'),
//     ${moduleImports.map((imp) => `${imp}: jest.fn()`).join(",")}
//   }))
// `);

export interface CodemonPluginOptions {
  types: typeof t;
  template: typeof template;
}

export function codemonPlugin({
  types: t,
  template,
}: CodemonPluginOptions): PluginObj {
  return {
    visitor: {
      ImportDeclaration(path) {
        const { referencePaths } = path.scope.getBinding("__RewireAPI__");
        referencePaths.forEach((refPath) => {
          let path = refPath;
          while (!t.isCallExpression(path.node)) {
            path = path.parentPath;
          }
          switch (path.node.callee.property.name) {
            case "__Rewire__": {
              const [fnName, fnValue] = path.node.arguments;
              path.replaceWith(template.ast`
                	${fnName.value}.mockImplementation(${getNodeAsString(
                this.file.code,
                fnValue
              )})
                `);
              break;
            }
            case "__ResetDependency__": {
              const fnName = path.node.arguments[0].value;
              path.replaceWith(template.ast`
                	${fnName}.mockReset();
                `);
              break;
            }
          }
        });
      },
    },
  };
}

function getNodeAsString(source: string, node): string {
  return source.slice(node.start, node.end);
}
