import { CandidateWithValues, Criterion, DecisionResult } from '../types';

/**
 * Simple Additive Weighting (SAW) Calculator
 *
 * Steps:
 * 1. Normalize each criterion:
 *    - BENEFIT: r_ij = x_ij / max_j
 *    - COST: r_ij = min_j / x_ij
 * 2. Calculate score:
 *    - S_i = Σ (w_j * r_ij)
 */
export class SAWCalculator {
    static calculate(
        candidates: CandidateWithValues[],
        criteria: Criterion[]
    ): DecisionResult[] {
        if (candidates.length === 0 || criteria.length === 0) {
            return [];
        }

        const weightsMap = new Map(
            criteria.map((criterion) => [criterion.id, (criterion.weight ?? 0) / 100])
        );

        const valuesByCriterion = new Map<string, number[]>();
        criteria.forEach((criterion) => valuesByCriterion.set(criterion.id, []));

        candidates.forEach((candidate) => {
            candidate.values.forEach((value) => {
                const list = valuesByCriterion.get(value.criterionId);
                if (list) {
                    list.push(value.value);
                }
            });
        });

        const maxByCriterion = new Map<string, number>();
        const minByCriterion = new Map<string, number>();
        valuesByCriterion.forEach((values, criterionId) => {
            maxByCriterion.set(criterionId, Math.max(...values, 0));
            minByCriterion.set(criterionId, Math.min(...values, 0));
        });

        const results: DecisionResult[] = candidates.map((candidate) => {
            const valuesMap = new Map(
                candidate.values.map((value) => [value.criterionId, value.value])
            );

            let score = 0;
            criteria.forEach((criterion) => {
                const value = valuesMap.get(criterion.id);
                const weight = weightsMap.get(criterion.id) ?? 0;
                if (value === undefined || weight === 0) {
                    return;
                }

                const max = maxByCriterion.get(criterion.id) ?? 0;
                const min = minByCriterion.get(criterion.id) ?? 0;
                let normalized = 0;

                if (criterion.impactType === 'BENEFIT') {
                    normalized = max > 0 ? value / max : 0;
                } else {
                    normalized = value > 0 ? min / value : 0;
                }

                score += weight * normalized;
            });

            return {
                candidateId: candidate.id,
                candidateName: candidate.name,
                imageUri: candidate.imageUri ?? null,
                score,
                rank: 0,
                values: Object.fromEntries(
                    candidate.values.map((value) => [value.criterionId, value.value])
                ),
            };
        });

        results.sort((a, b) => b.score - a.score);
        results.forEach((result, index) => {
            result.rank = index + 1;
        });

        return results;
    }

    static normalizeToPercentage(results: DecisionResult[]): DecisionResult[] {
        if (results.length === 0) {
            return [];
        }

        const maxScore = Math.max(...results.map((result) => result.score));
        if (maxScore === 0) {
            return results;
        }

        return results.map((result) => ({
            ...result,
            score: (result.score / maxScore) * 100,
        }));
    }

    static calculateNormalized(
        candidates: CandidateWithValues[],
        criteria: Criterion[]
    ): DecisionResult[] {
        const results = this.calculate(candidates, criteria);
        return this.normalizeToPercentage(results);
    }
}
