import fs from "node:fs";
import path from "node:path";
import { Glob } from "glob";
import babel from "@babel/core";
import * as parser from "@babel/parser";
import recast from "recast";
import resolve from "enhanced-resolve";
import { codemonPlugin } from "./codemonPlugin.ts";

function transform(sourceCode: string): string {
  const ast = recast.parse(sourceCode, {
    parser: {
      parse(source: string) {
        return parser.parse(source, {
          // filename,
          tokens: true,
          sourceType: "module",
          // plugins: ["typescript"],
        });
      },
    },
  });

  babel.transformFromAstSync(ast, sourceCode, {
    code: false,
    cloneInputAst: false,
    configFile: false,
    plugins: [codemonPlugin],
  });

  return recast.print(ast).code;
}

function transformFile(fileRelativePath: string) {
  const filePath = path.resolve(process.cwd(), fileRelativePath);
  // console.log(path.resolve(filePath, "example/withBulkMoveCopy"));

  const webpackConfig = import("conf/webpack/webpack.prod.js");

  const inputCode = fs.readFileSync(filePath, "utf-8");
  const outputCode = transform(inputCode);

  console.log(`modified: ${filePath}`);
  fs.writeFileSync(filePath, outputCode);
}

const filesPattern = process.argv[2];

if (!filesPattern) throw new Error("Missing source files glob argument");

const g = new Glob(filesPattern, {});

for await (const path of g) {
  transformFile(path);
}
