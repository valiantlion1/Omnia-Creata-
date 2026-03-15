import * as ort from 'onnxruntime-web';

// Configure ONNX Runtime to use WASM backend
ort.env.wasm.wasmPaths = '/assets/wasm/';

export class OnDeviceAI {
  private session: ort.InferenceSession | null = null;
  private modelPath: string;

  constructor(modelName: string) {
    // Models should be placed in public/models/
    this.modelPath = `/models/${modelName}.onnx`;
  }

  /**
   * Load the ONNX model into memory
   */
  async loadModel(): Promise<void> {
    try {
      if (!this.session) {
        console.log(`Loading model from ${this.modelPath}...`);
        this.session = await ort.InferenceSession.create(this.modelPath, {
          executionProviders: ['wasm'], // 'webgl' can be added for GPU support if available
        });
        console.log('Model loaded successfully');
      }
    } catch (e) {
      console.error('Failed to load model:', e);
      throw e;
    }
  }

  /**
   * Run inference on an image input
   * This is a placeholder for actual image preprocessing/postprocessing logic
   * which varies greatly depending on the specific model (U2Net, ESRGAN, etc.)
   */
  async runInference(inputTensor: ort.Tensor): Promise<ort.Tensor> {
    if (!this.session) {
      await this.loadModel();
    }

    if (!this.session) throw new Error("Session not initialized");

    const feeds: Record<string, ort.Tensor> = {};
    // Usually the input name is 'input' or similar, check model metadata via Netron
    const inputName = this.session.inputNames[0];
    feeds[inputName] = inputTensor;

    const results = await this.session.run(feeds);
    const outputName = this.session.outputNames[0];
    return results[outputName];
  }

  /**
   * Helper to convert HTMLImageElement to Tensor (NCHW format usually)
   * This is a simplified version; real implementation needs resizing/normalization
   */
  static async imageToTensor(image: HTMLImageElement, width: number, height: number): Promise<ort.Tensor> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context not available");

    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    // Convert to Float32 and NCHW layout (1, 3, H, W)
    const float32Data = new Float32Array(3 * width * height);
    
    // Normalization usually involves (pixel / 255.0 - mean) / std
    // Here we just do pixel / 255.0 for demo
    for (let i = 0; i < width * height; i++) {
      float32Data[i] = data[i * 4] / 255.0; // R
      float32Data[width * height + i] = data[i * 4 + 1] / 255.0; // G
      float32Data[2 * width * height + i] = data[i * 4 + 2] / 255.0; // B
    }

    return new ort.Tensor('float32', float32Data, [1, 3, height, width]);
  }
}

// Singleton instance for a default model (e.g. background removal)
export const bgRemoverAI = new OnDeviceAI('u2net_human_seg');
