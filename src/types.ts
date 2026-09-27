export interface TokenCandidate {
  token: string;
  tokenId?: number;
  logProbability: number;
  probability: number; // calculated as exp(logProbability)
}

export interface TokenStep {
  stepIndex: number;
  selectedToken: string;
  selectedLogProb: number;
  selectedProbability: number;
  entropy?: number;
  topCandidates: TokenCandidate[];
}

export interface AnalysisResponse {
  prompt: string;
  fullResponseText: string;
  modelUsed: string;
  durationMs: number;
  steps: TokenStep[];
  isRealLogprobApi: boolean;
}
