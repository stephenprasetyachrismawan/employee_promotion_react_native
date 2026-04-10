import { AHPMatrixAnalysis } from '../types';

export type SerializedAHPMatrixRow = Record<string, number>;

export const RI_TABLE: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0.58,
    4: 0.9,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
};

const validateMatrix = (matrix: number[][]) => {
    const size = matrix.length;
    if (size === 0) {
        throw new Error('AHP matrix must contain at least one row');
    }

    matrix.forEach((row) => {
        if (row.length !== size) {
            throw new Error('AHP matrix must be square');
        }
        row.forEach((value) => {
            if (!Number.isFinite(value) || value <= 0) {
                throw new Error('AHP matrix values must be positive numbers');
            }
        });
    });
};

export function computeColumnSums(matrix: number[][]): number[] {
    validateMatrix(matrix);
    return matrix[0].map((_, columnIndex) =>
        matrix.reduce((sum, row) => sum + row[columnIndex], 0)
    );
}

export function normalizeMatrix(matrix: number[][], columnSums: number[]): number[][] {
    validateMatrix(matrix);
    return matrix.map((row) =>
        row.map((value, columnIndex) => value / columnSums[columnIndex])
    );
}

export function computePriorityVector(normalizedMatrix: number[][]): number[] {
    validateMatrix(normalizedMatrix);
    return normalizedMatrix.map(
        (row) => row.reduce((sum, value) => sum + value, 0) / normalizedMatrix.length
    );
}

export function computeWeightedSumVector(
    matrix: number[][],
    priorityVector: number[]
): number[] {
    validateMatrix(matrix);
    return matrix.map((row) =>
        row.reduce((sum, value, columnIndex) => sum + value * priorityVector[columnIndex], 0)
    );
}

export function computeLambdaMax(
    weightedSumVector: number[],
    priorityVector: number[]
): number {
    if (weightedSumVector.length !== priorityVector.length) {
        throw new Error('Weighted sum vector and priority vector must have the same length');
    }

    return (
        weightedSumVector.reduce(
            (sum, value, index) => sum + value / priorityVector[index],
            0
        ) / weightedSumVector.length
    );
}

export function computeCI(lambdaMax: number, n: number): number {
    if (n <= 2) {
        return 0;
    }
    return (lambdaMax - n) / (n - 1);
}

export function computeRI(n: number): number {
    return RI_TABLE[n] ?? RI_TABLE[10];
}

export function computeCR(ci: number, ri: number): number {
    if (ri === 0) {
        return 0;
    }
    return ci / ri;
}

export function analyzeAHPMatrix(matrix: number[][]): AHPMatrixAnalysis {
    validateMatrix(matrix);
    const columnSums = computeColumnSums(matrix);
    const normalizedMatrix = normalizeMatrix(matrix, columnSums);
    const priorityVector = computePriorityVector(normalizedMatrix);
    const weightedSumVector = computeWeightedSumVector(matrix, priorityVector);
    const consistencyVector = weightedSumVector.map(
        (value, index) => value / priorityVector[index]
    );
    const lambdaMax = computeLambdaMax(weightedSumVector, priorityVector);
    const ci = computeCI(lambdaMax, matrix.length);
    const ri = computeRI(matrix.length);
    const cr = computeCR(ci, ri);

    return {
        normalizedMatrix,
        columnSums,
        priorityVector,
        weightedSumVector,
        consistencyVector,
        lambdaMax,
        ci,
        ri,
        cr,
        isConsistent: cr < 0.1,
    };
}

export function createDefaultMatrix(n: number): number[][] {
    if (!Number.isInteger(n) || n < 1) {
        throw new Error('Matrix size must be a positive integer');
    }

    return Array.from({ length: n }, () => Array.from({ length: n }, () => 1));
}

export function serializeAHPMatrix(matrix: number[][]): SerializedAHPMatrixRow[] {
    validateMatrix(matrix);
    return matrix.map((row) =>
        row.reduce<SerializedAHPMatrixRow>((serializedRow, value, columnIndex) => {
            serializedRow[`c${columnIndex}`] = value;
            return serializedRow;
        }, {})
    );
}

export function deserializeAHPMatrix(value: unknown): number[][] {
    if (!Array.isArray(value)) {
        return [];
    }

    if (value.every((row) => Array.isArray(row))) {
        return value as number[][];
    }

    return value.map((row) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            return [];
        }

        return Object.entries(row as SerializedAHPMatrixRow)
            .sort(([leftKey], [rightKey]) => Number(leftKey.slice(1)) - Number(rightKey.slice(1)))
            .map(([, cellValue]) => cellValue);
    });
}

export function setReciprocal(
    matrix: number[][],
    i: number,
    j: number,
    value: number
): number[][] {
    validateMatrix(matrix);
    if (i === j) {
        return matrix.map((row) => [...row]);
    }
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error('Pairwise value must be a positive number');
    }

    const nextMatrix = matrix.map((row) => [...row]);
    nextMatrix[i][j] = value;
    nextMatrix[j][i] = 1 / value;
    return nextMatrix;
}

export function computeGlobalPriorities(
    criteriaWeights: number[],
    alternativePriorityVectors: number[][]
): number[] {
    if (criteriaWeights.length !== alternativePriorityVectors.length) {
        throw new Error('Criteria weights must match alternative priority vectors');
    }
    if (alternativePriorityVectors.length === 0) {
        return [];
    }

    const alternativeCount = alternativePriorityVectors[0].length;
    return Array.from({ length: alternativeCount }, (_, alternativeIndex) =>
        criteriaWeights.reduce(
            (sum, weight, criteriaIndex) =>
                sum + weight * alternativePriorityVectors[criteriaIndex][alternativeIndex],
            0
        )
    );
}
