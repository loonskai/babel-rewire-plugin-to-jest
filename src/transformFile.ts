import fs from "node:fs";
import path from "node:path";
import { ResolveFunction } from "enhanced-resolve";
import { transform } from "./transform.js";

export function transformFile(
  fileRelativePath: string,
  webpackResolver: ResolveFunction
) {
  try {
    const fileAbsolutePath = path.resolve(process.cwd(), fileRelativePath);
    const inputCode = fs.readFileSync(fileAbsolutePath, "utf-8");
    const outputCode = transform(inputCode, fileAbsolutePath, webpackResolver);
    fs.writeFileSync(fileAbsolutePath, outputCode);
  } catch (error) {
    console.error(
      `Error while transorming the file ${fileRelativePath}: ${error}`
    );
  }
}
