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
