import { Site } from './types';

export interface ScoreWeights {
  price: number;
  match: number;
  availability: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  price: 0.4,
  match: 0.4,
  availability: 0.2,
};

export function scoreSite(
  site: Site,
  adjustedPrice: number,
  matchScore: number,
  gapPenalty: number,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): number {
  const priceScore = 1 - Math.min(adjustedPrice / 500, 1);
  const availScore = 1 - gapPenalty;

  return (
    weights.price * priceScore +
    weights.match * matchScore +
    weights.availability * availScore
  );
}

export function sortSitesByScore<T extends { score: number }>(sites: T[]): T[] {
  return [...sites].sort((a, b) => b.score - a.score);
}
