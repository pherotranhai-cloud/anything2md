import fs from 'fs';
import path from 'path';
import os from 'os';

class StorageService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'pptx2md-temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  getTempDir(): string {
    return this.tempDir;
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.error(`Failed to cleanup file ${filePath}:`, err);
    }
  }
}

export default new StorageService();
