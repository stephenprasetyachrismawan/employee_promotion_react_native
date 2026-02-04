import { Criterion, CandidateWithValues, WPMResult } from '../types';

/**
 * Weighted Product Method (WPM) Calculator
 * 
 * Formula:
 * For each candidate i:
 * S_i = ∏(x_ij^w_j) for all criteria j
 * 
 * Where:
 * - x_ij is the value of criterion j for candidate i
 * - w_j is the normalized weight for criterion j (as decimal, not percentage)
 * - For BENEFIT criteria: use positive exponent w_j
 * - For COST criteria: use negative exponent -w_j (or 1/x_ij^w_j)
 */

export class WPMCalculator {
    /**
     * Calculate WPM scores for all candidates
     */
    static calculate(
        candidates: CandidateWithValues[],
        criteria: Criterion[]
    ): WPMResult[] {
        if (candidates.length === 0 || criteria.length === 0) {
            return [];
        }

        // Create a map of criterion ID to weight
        const weightsMap = new Map(
            criteria.map(c => [c.id, (c.weight ?? 0) / 100])
        ); // Convert to decimal

        const results: WPMResult[] = [];

        for (const candidate of candidates) {
            let score = 1; // Start with 1 for multiplication

            // Create values map for easy lookup
            const valuesMap = new Map(
                candidate.values.map(v => [v.criterionId, v.value])
            );

            // Calculate product for each criterion
            for (const criterion of criteria) {
                const value = valuesMap.get(criterion.id);
                const weight = weightsMap.get(criterion.id);

                if (value === undefined || weight === undefined || weight === 0) {
                    continue; // Skip if no value or no weight
                }

                // Ensure value is positive (required for exponentiation)
                if (value <= 0) {
                    console.warn(
                        `Invalid value ${value} for criterion ${criterion.name} in candidate ${candidate.name}`
                    );
                    continue;
                }

                // Apply weighted exponent based on impact type
                if (criterion.impactType === 'BENEFIT') {
                    // Higher is better: x^w
                    score *= Math.pow(value, weight);
                } else {
                    // Lower is better (COST): x^(-w) or 1/(x^w)
                    score *= Math.pow(value, -weight);
                }
            }

            results.push({
                candidateId: candidate.id,
                candidateName: candidate.name,
                score,
                rank: 0, // Will be set after sorting
                values: Object.fromEntries(
                    candidate.values.map(v => [v.criterionId, v.value])
                ),
            });
        }

        // Sort by score descending (highest score = best candidate)
        results.sort((a, b) => b.score - a.score);

        // Assign ranks
        results.forEach((result, index) => {
            result.rank = index + 1;
        });

        return results;
    }

    /**
     * Normalize scores to percentage (0-100%)
     * Based on the highest score being 100%
     */
    static normalizeToPercentage(results: WPMResult[]): WPMResult[] {
        if (results.length === 0) {
            return [];
        }

        const maxScore = Math.max(...results.map(r => r.score));

        if (maxScore === 0) {
            return results;
        }

        return results.map(result => ({
            ...result,
            score: (result.score / maxScore) * 100,
        }));
    }

    /**
     * Calculate and return normalized results
     */
    static calculateNormalized(
        candidates: CandidateWithValues[],
        criteria: Criterion[]
    ): WPMResult[] {
        const results = this.calculate(candidates, criteria);
        return this.normalizeToPercentage(results);
    }
}
