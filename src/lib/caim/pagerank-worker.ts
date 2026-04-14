/**
 * Web Worker entry point for PageRank computation.
 * Receives input via postMessage, runs computePageRank, posts result back.
 */
import { computePageRank, type PageRankInput, type PageRankResult } from './pagerank';

self.onmessage = (e: MessageEvent<PageRankInput>) => {
  const result: PageRankResult = computePageRank(e.data);
  self.postMessage(result);
};
