import babel from "@babel/core";
import * as parser from "@babel/parser";
import recast from "recast";
import { ResolveFunctionAsync } from "enhanced-resolve";
import { getCodemodPlugin } from "./codemodPlugin.js";

export function transform(
  sourceCode: string,
  filePath: string,
  resolver: ResolveFunctionAsync
): string {
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

  const code = babel.transformFromAstSync(ast, sourceCode, {
    cloneInputAst: false,
    configFile: false,
    plugins: [getCodemodPlugin(sourceCode, filePath, resolver)],
  });

  console.log(code);

  return recast.print(ast).code;
}
