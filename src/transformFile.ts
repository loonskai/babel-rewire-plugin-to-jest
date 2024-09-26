import fs from "node:fs";
import path from "node:path";
import { ResolveFunctionAsync } from "enhanced-resolve";
import { transform } from "./transform.js";

export function transformFile(
  fileRelativePath: string,
  webpackResolver: ResolveFunctionAsync
) {
  try {
    const fileAbsolutePath = path.resolve(process.cwd(), fileRelativePath);
    const inputCode = fs.readFileSync(fileAbsolutePath, "utf-8");
    const outputCode = transform(inputCode, fileAbsolutePath, webpackResolver);

    fs.writeFileSync(
      path.resolve(process.cwd(), "something.test.js"),
      outputCode
    );
  } catch (error) {
    console.error(
      `Error while transorming the file ${fileRelativePath}: ${error}`
    );
  }
}
