import {
    analyzeAHPMatrix,
    computeGlobalPriorities,
    createDefaultMatrix,
    setReciprocal,
} from './ahp';

const assertClose = (actual: number, expected: number, tolerance = 0.0001) => {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`Expected ${actual} to be within ${tolerance} of ${expected}`);
    }
};

const assertArrayClose = (actual: number[], expected: number[], tolerance = 0.0001) => {
    if (actual.length !== expected.length) {
        throw new Error(`Expected array length ${expected.length}, received ${actual.length}`);
    }

    actual.forEach((value, index) => assertClose(value, expected[index], tolerance));
};

const defaultMatrix = createDefaultMatrix(3);
if (defaultMatrix.length !== 3 || defaultMatrix.some((row) => row.some((value) => value !== 1))) {
    throw new Error('createDefaultMatrix should create an n x n matrix filled with 1');
}

const updatedMatrix = setReciprocal(defaultMatrix, 0, 2, 5);
assertClose(updatedMatrix[0][2], 5);
assertClose(updatedMatrix[2][0], 0.2);
assertClose(defaultMatrix[0][2], 1);

const analysis = analyzeAHPMatrix([
    [1, 3, 5],
    [1 / 3, 1, 2],
    [1 / 5, 1 / 2, 1],
]);

assertArrayClose(analysis.columnSums, [1.533333, 4.5, 8], 0.0001);
assertArrayClose(analysis.priorityVector, [0.647947, 0.229871, 0.122181], 0.0001);
assertClose(analysis.lambdaMax, 3.003694, 0.0001);
assertClose(analysis.ci, 0.001847, 0.0001);
assertClose(analysis.ri, 0.58, 0.0001);
assertClose(analysis.cr, 0.003185, 0.0001);

const globalPriorities = computeGlobalPriorities(
    [0.75, 0.25],
    [
        [0.7, 0.3],
        [0.6, 0.4],
    ]
);

assertArrayClose(globalPriorities, [0.675, 0.325], 0.0001);
