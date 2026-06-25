// 5D Strategic Tensor Implementation
// Mathematical foundation for cross-domain synthesis

export interface Tensor5DConfig {
  evidenceDim: number;      // E = 128
  domainDim: number;        // D = 8
  timeDim: number;          // T = 16
  confidenceDim: number;    // C = 5
  verificationDim: number;  // V = 4
  dualDim: number;          // 2 (forward/backward)
}

export class Tensor5D {
  private data: Float32Array;
  private config: Tensor5DConfig;
  private strides: number[];

  constructor(config: Tensor5DConfig) {
    this.config = config;
    this.strides = this.computeStrides();
    const totalSize = this.strides[0] * config.evidenceDim;
    this.data = new Float32Array(totalSize);
  }

  private computeStrides(): number[] {
    const { evidenceDim, domainDim, timeDim, confidenceDim, verificationDim, dualDim } = this.config;
    // Strides for [dual, verification, confidence, time, domain, evidence]
    return [
      verificationDim * confidenceDim * timeDim * domainDim * evidenceDim, // dual stride
      confidenceDim * timeDim * domainDim * evidenceDim, // verification stride
      timeDim * domainDim * evidenceDim, // confidence stride
      domainDim * evidenceDim, // time stride
      evidenceDim, // domain stride
      1 // evidence stride
    ];
  }

  get(dual: number, v: number, c: number, t: number, d: number, e: number): number {
    const index = this.getIndex(dual, v, c, t, d, e);
    return this.data[index];
  }

  set(dual: number, v: number, c: number, t: number, d: number, e: number, value: number): void {
    const index = this.getIndex(dual, v, c, t, d, e);
    this.data[index] = value;
  }

  private getIndex(dual: number, v: number, c: number, t: number, d: number, e: number): number {
    return dual * this.strides[0] +
           v * this.strides[1] +
           c * this.strides[2] +
           t * this.strides[3] +
           d * this.strides[4] +
           e * this.strides[5];
  }

  // Apply sigmoid activation to all elements
  sigmoid(): Tensor5D {
    const result = new Tensor5D(this.config);
    for (let i = 0; i < this.data.length; i++) {
      result.data[i] = 1 / (1 + Math.exp(-this.data[i]));
    }
    return result;
  }

  // Element-wise multiplication (Hadamard product)
  hadamard(other: Tensor5D): Tensor5D {
    if (this.data.length !== other.data.length) {
      throw new Error('Tensor dimensions must match for Hadamard product');
    }
    const result = new Tensor5D(this.config);
    for (let i = 0; i < this.data.length; i++) {
      result.data[i] = this.data[i] * other.data[i];
    }
    return result;
  }

  // Dot product along evidence dimension
  dotEvidence(vector: Float32Array): number {
    if (vector.length !== this.config.evidenceDim) {
      throw new Error('Vector dimension must match evidence dimension');
    }
    
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
      sum += this.data[i] * vector[i];
    }
    return sum;
  }

  // Get slice for specific domain and time
  getSlice(domain: number, time: number): Float32Array {
    const { evidenceDim, confidenceDim, verificationDim, dualDim } = this.config;
    const sliceSize = evidenceDim * confidenceDim * verificationDim * dualDim;
    const slice = new Float32Array(sliceSize);
    
    let idx = 0;
    for (let dual = 0; dual < dualDim; dual++) {
      for (let v = 0; v < verificationDim; v++) {
        for (let c = 0; c < confidenceDim; c++) {
          for (let e = 0; e < evidenceDim; e++) {
            slice[idx++] = this.get(dual, v, c, time, domain, e);
          }
        }
      }
    }
    return slice;
  }

  // Apply softmax along evidence dimension
  softmaxEvidence(dual: number, v: number, c: number, t: number, d: number): Float32Array {
    const result = new Float32Array(this.config.evidenceDim);
    let maxVal = -Infinity;
    
    // Find max for numerical stability
    for (let e = 0; e < this.config.evidenceDim; e++) {
      maxVal = Math.max(maxVal, this.get(dual, v, c, t, d, e));
    }
    
    // Compute exp and sum
    let sum = 0;
    for (let e = 0; e < this.config.evidenceDim; e++) {
      const expVal = Math.exp(this.get(dual, v, c, t, d, e) - maxVal);
      result[e] = expVal;
      sum += expVal;
    }
    
    // Normalize
    for (let e = 0; e < this.config.evidenceDim; e++) {
      result[e] /= sum;
    }
    
    return result;
  }

  // Initialize with random values (Xavier initialization)
  randomize(): void {
    const scale = Math.sqrt(2.0 / this.config.evidenceDim);
    for (let i = 0; i < this.data.length; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      this.data[i] = z * scale;
    }
  }

  // Initialize with zeros
  zeros(): void {
    this.data.fill(0);
  }

  // Initialize with ones
  ones(): void {
    this.data.fill(1);
  }

  // Get raw data
  getData(): Float32Array {
    return this.data;
  }

  // Get configuration
  getConfig(): Tensor5DConfig {
    return { ...this.config };
  }
}

// Strategic Tensor - Specialized for synthesis operations
export class StrategicTensor {
  private forward: Tensor5D;  // T⁺
  private backward: Tensor5D; // T⁻
  private config: Tensor5DConfig;

  constructor(domainCount: number) {
    this.config = {
      evidenceDim: 128,
      domainDim: Math.min(domainCount, 8),
      timeDim: 16,
      confidenceDim: 5,
      verificationDim: 4,
      dualDim: 1 // Each tensor is single-dual
    };

    this.forward = new Tensor5D(this.config);
    this.backward = new Tensor5D(this.config);

    // Initialize
    this.forward.randomize();
    this.backward.randomize();
  }

  // Forward synthesis: evidence → conclusion
  forwardSynthesis(
    evidenceVector: Float32Array,
    domain: number,
    time: number,
    confidence: number,
    verification: number
  ): number {
    // Apply sigmoid to forward tensor for probability interpretation
    const sigmoidForward = this.forward.sigmoid();
    
    // Compute dot product
    let synthesisScore = 0;
    for (let e = 0; e < this.config.evidenceDim; e++) {
      synthesisScore += sigmoidForward.get(0, verification, confidence, time, domain, e) * evidenceVector[e];
    }
    
    return synthesisScore;
  }

  // Backward critique: conclusion → evidence verification
  backwardCritique(
    verificationMask: Float32Array,
    domain: number,
    time: number
  ): number {
    let critiqueScore = 0;
    let maskSum = 0;

    for (let v = 0; v < this.config.verificationDim; v++) {
      for (let c = 0; c < this.config.confidenceDim; c++) {
        const maskValue = verificationMask[v * this.config.confidenceDim + c];
        maskSum += maskValue;

        for (let e = 0; e < this.config.evidenceDim; e++) {
          critiqueScore += this.backward.get(0, v, c, time, domain, e) * maskValue;
        }
      }
    }

    return maskSum > 0 ? critiqueScore / maskSum : 0;
  }

  // Fused synthesis: forward × (1 + sigmoid(backward))
  fusedSynthesis(
    evidenceVector: Float32Array,
    domain: number,
    time: number,
    confidence: number,
    verification: number
  ): number {
    const forwardScore = this.forwardSynthesis(evidenceVector, domain, time, confidence, verification);
    
    // Create verification mask for backward
    const verificationMask = new Float32Array(this.config.verificationDim * this.config.confidenceDim);
    verificationMask.fill(1); // Uniform mask for simplicity
    
    const backwardScore = this.backwardCritique(verificationMask, domain, time);
    const sigmoidBackward = 1 / (1 + Math.exp(-backwardScore));

    // Fusion: forward amplified by critique awareness
    return forwardScore * (1 + sigmoidBackward);
  }

  // Update tensor with Adam optimizer
  updateAdam(
    gradient: Tensor5D,
    m: Tensor5D,
    v: Tensor5D,
    beta1: number,
    beta2: number,
    epsilon: number,
    learningRate: number,
    t: number
  ): void {
    const config = this.forward.getConfig();
    
    // Bias correction
    const mHat = 1 / (1 - Math.pow(beta1, t));
    const vHat = 1 / (1 - Math.pow(beta2, t));

    // Update each element
    for (let dual = 0; dual < config.dualDim; dual++) {
      for (let ver = 0; ver < config.verificationDim; ver++) {
        for (let conf = 0; conf < config.confidenceDim; conf++) {
          for (let time = 0; time < config.timeDim; time++) {
            for (let dom = 0; dom < config.domainDim; dom++) {
              for (let e = 0; e < config.evidenceDim; e++) {
                const grad = gradient.get(dual, ver, conf, time, dom, e);
                
                // Update momentum
                const mNew = beta1 * m.get(dual, ver, conf, time, dom, e) + (1 - beta1) * grad;
                m.set(dual, ver, conf, time, dom, e, mNew);
                
                // Update velocity
                const vNew = beta2 * v.get(dual, ver, conf, time, dom, e) + (1 - beta2) * grad * grad;
                v.set(dual, ver, conf, time, dom, e, vNew);
                
                // Compute update
                const update = learningRate * (mNew * mHat) / (Math.sqrt(vNew * vHat) + epsilon);
                
                // Apply to forward tensor
                const current = this.forward.get(dual, ver, conf, time, dom, e);
                this.forward.set(dual, ver, conf, time, dom, e, current - update);
              }
            }
          }
        }
      }
    }
  }

  // Get cross-domain correlation score
  getCrossDomainCorrelation(domainA: number, domainB: number, time: number): number {
    let correlation = 0;
    
    for (let e = 0; e < this.config.evidenceDim; e++) {
      for (let c = 0; c < this.config.confidenceDim; c++) {
        for (let v = 0; v < this.config.verificationDim; v++) {
          const valA = this.forward.get(0, v, c, time, domainA, e);
          const valB = this.forward.get(0, v, c, time, domainB, e);
          correlation += valA * valB;
        }
      }
    }
    
    return correlation / (this.config.confidenceDim * this.config.verificationDim * this.config.evidenceDim);
  }

  // Serialize to JSON
  serialize(): object {
    return {
      config: this.config,
      forward: Array.from(this.forward.getData()),
      backward: Array.from(this.backward.getData())
    };
  }

  // Deserialize from JSON
  static deserialize(data: any): StrategicTensor {
    const tensor = new StrategicTensor(data.config.domainDim);
    tensor.forward = new Tensor5D(data.config);
    tensor.backward = new Tensor5D(data.config);
    
    tensor.forward.getData().set(new Float32Array(data.forward));
    tensor.backward.getData().set(new Float32Array(data.backward));
    
    return tensor;
  }
}

// Utility functions for tensor operations
export const TensorUtils = {
  // Create evidence vector from text embedding (simplified)
  textToEvidenceVector(text: string, dim: number = 128): Float32Array {
    const vector = new Float32Array(dim);
    
    // Simple hash-based embedding for demonstration
    // In production, use proper embedding model
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      vector[i % dim] += charCode / 255;
    }
    
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dim; i++) {
        vector[i] /= magnitude;
      }
    }
    
    return vector;
  },

  // Cosine similarity between two vectors
  cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimension');
    }
    
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
  },

  // Create confidence-weighted evidence vector
  weightByConfidence(
    evidence: Float32Array, 
    confidence: number
  ): Float32Array {
    const weighted = new Float32Array(evidence.length);
    for (let i = 0; i < evidence.length; i++) {
      weighted[i] = evidence[i] * confidence;
    }
    return weighted;
  }
};
