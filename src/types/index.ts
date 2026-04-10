// Data types
export type DataType = 'NUMERIC' | 'SCALE';
export type ImpactType = 'BENEFIT' | 'COST';
export type DecisionMethod = 'WPM' | 'SAW';

// Criterion model
export interface Criterion {
    id: string; // Changed from number to string for Firestore
    groupId: string;
    name: string;
    dataType: DataType;
    impactType: ImpactType;
    weight: number;
    isWeightLocked?: boolean;
    createdAt: string;
}

// Criteria group model
export interface CriteriaGroup {
    id: string;
    name: string;
    description?: string | null;
    method: DecisionMethod;
    groupType?: 'criteria' | 'input' | null;
    sourceGroupId?: string | null;
    createdAt: string;
}

// Candidate model
export interface Candidate {
    id: string; // Changed from number to string for Firestore
    groupId: string;
    name: string;
    imageUri?: string | null;
    createdAt: string;
}

// Candidate value model
export interface CandidateValue {
    candidateId: string; // Changed from number to string
    criterionId: string; // Changed from number to string
    value: number;
}

// Candidate with values
export interface CandidateWithValues extends Candidate {
    values: CandidateValue[];
}

// Decision Support System Result
export interface DecisionResult {
    candidateId: string;
    candidateName: string;
    imageUri?: string | null;
    score: number;
    rank: number;
    values: Record<string, number>;
}

export interface AHPMatrixAnalysis {
    normalizedMatrix: number[][];
    columnSums: number[];
    priorityVector: number[];
    weightedSumVector: number[];
    consistencyVector: number[];
    lambdaMax: number;
    ci: number;
    ri: number;
    cr: number;
    isConsistent: boolean;
}

export interface AHPWeightingSession extends AHPMatrixAnalysis {
    id: string;
    groupId: string;
    criteriaIds: string[];
    criteriaNames: string[];
    pairwiseMatrix: number[][];
    appliedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AHPProject {
    id: string;
    name: string;
    goal: string;
    status: 'draft' | 'complete';
    hasSub: boolean;
    currentStep: number;
    createdAt: string;
    updatedAt: string;
}

export interface AHPCriterion {
    id: string;
    projectId: string;
    name: string;
    order: number;
    weight: number;
    createdAt: string;
}

export interface AHPSubCriterion {
    id: string;
    projectId: string;
    criterionId: string;
    name: string;
    order: number;
    localWeight: number;
    globalWeight: number;
    createdAt: string;
}

export interface AHPAlternative {
    id: string;
    projectId: string;
    name: string;
    order: number;
    createdAt: string;
}

export type AHPMatrixLevel =
    | 'criteria'
    | 'sub_criteria'
    | 'alternative_per_criterion'
    | 'alternative_per_sub';

export interface AHPMatrix extends AHPMatrixAnalysis {
    id: string;
    projectId: string;
    level: AHPMatrixLevel;
    parentId: string | null;
    criteriaIds: string[];
    alternativeIds: string[];
    matrix: number[][];
    updatedAt: string;
}

export interface AHPGlobalResult {
    alternativeId: string;
    alternativeName: string;
    globalScore: number;
    rank: number;
    scorePerCriteria: Record<string, number>;
}
