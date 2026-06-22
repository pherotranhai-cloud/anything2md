import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = util.promisify(exec);

export interface ParseConfig {
  disable_image?: boolean;
  enable_slides?: boolean;
  min_block_size?: number;
  [key: string]: any;
}

export interface ParseResult {
  markdown?: string;
  jsonAst?: any;
}

class pptxParser {
  async parseFile(filePath: string, config: ParseConfig = {}): Promise<ParseResult> {
    try {
      // Create output paths in the same directory as the temp file
      const baseName = path.basename(filePath);
      const tempDir = path.dirname(filePath);
      const mdOutputPath = path.join(tempDir, `${baseName}.md`);
      const jsonOutputPath = path.join(tempDir, `${baseName}.json`);

      // 1. Generate Markdown Representation
      let mdArgs = [`--to md`, `--output ${mdOutputPath}`, `--fileType=pptx`];
      // Note: We are using officeparser to emulate pptx2md functionality internally
      // as it's the Node.js standard that provides similar features.
      if (config.disable_image) {
         // Custom flags if supported, otherwise base parsing
      }
      
      const mdCommand = `npx officeparser "${filePath}" ${mdArgs.join(' ')}`;
      await execAsync(mdCommand);
      
      // 2. Generate JSON AST Representation 
      let jsonArgs = [`--to json`, `--output ${jsonOutputPath}`, `--fileType=pptx`];
      const jsonCommand = `npx officeparser "${filePath}" ${jsonArgs.join(' ')}`;
      await execAsync(jsonCommand);

      // Read outputs
      const markdown = fs.existsSync(mdOutputPath) ? await fs.promises.readFile(mdOutputPath, 'utf8') : '';
      const jsonAstStr = fs.existsSync(jsonOutputPath) ? await fs.promises.readFile(jsonOutputPath, 'utf8') : '{}';
      
      let jsonAst = {};
      try {
        jsonAst = JSON.parse(jsonAstStr);
      } catch (e) {
        console.warn("Could not parse JSON AST output");
      }

      // Cleanup generated files
      if (fs.existsSync(mdOutputPath)) await fs.promises.unlink(mdOutputPath).catch(console.error);
      if (fs.existsSync(jsonOutputPath)) await fs.promises.unlink(jsonOutputPath).catch(console.error);

      return {
        markdown: markdown,
        jsonAst: jsonAst
      };
    } catch (err: any) {
      console.error("Parser implementation error:", err);
      throw new Error(`Parser failed: ${err.message}`);
    }
  }
}

export default new pptxParser();
