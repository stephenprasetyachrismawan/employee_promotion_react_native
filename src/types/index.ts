// Data types
export type DataType = 'NUMERIC' | 'SCALE';
export type ImpactType = 'BENEFIT' | 'COST';

// Criterion model
export interface Criterion {
    id: string; // Changed from number to string for Firestore
    name: string;
    dataType: DataType;
    impactType: ImpactType;
    createdAt: string;
}

// Weight model
export interface Weight {
    criterionId: string; // Changed from number to string
    weight: number;
    isLocked: boolean;
}

// Candidate model
export interface Candidate {
    id: string; // Changed from number to string for Firestore
    name: string;
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

// WPM Result
export interface WPMResult {
    candidateId: string;
    candidateName: string;
    score: number;
    rank: number;
    values: Record<string, number>;
}
