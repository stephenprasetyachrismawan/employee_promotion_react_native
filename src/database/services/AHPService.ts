import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    DocumentReference,
    getDoc,
    getDocs,
    query,
    Timestamp,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
    AHPAlternative,
    AHPCriterion,
    AHPGlobalResult,
    AHPMatrix,
    AHPMatrixLevel,
    AHPProject,
    AHPSubCriterion,
    AHPWeightingSession,
} from '../../types';
import { analyzeAHPMatrix, computeGlobalPriorities, createDefaultMatrix } from '../../utils/ahp';

interface MatrixSaveData {
    id?: string;
    level: AHPMatrixLevel;
    parentId?: string | null;
    criteriaIds?: string[];
    alternativeIds?: string[];
    matrix: number[][];
}

export class AHPService {
    private static readonly BATCH_CHUNK_SIZE = 450;

    private static getWeightingSessionsRef(userId: string) {
        return collection(db, 'users', userId, 'ahpWeightingSessions');
    }

    private static getCriteriaRef(userId: string) {
        return collection(db, 'users', userId, 'criteria');
    }

    private static getProjectsRef(userId: string) {
        return collection(db, 'users', userId, 'ahpProjects');
    }

    private static getProjectRef(userId: string, projectId: string) {
        return doc(this.getProjectsRef(userId), projectId);
    }

    private static getProjectCollectionRef(
        userId: string,
        projectId: string,
        collectionName: string
    ) {
        return collection(this.getProjectRef(userId, projectId), collectionName);
    }

    private static getProjectDocRef(
        userId: string,
        projectId: string,
        collectionName: string,
        id: string
    ) {
        return doc(this.getProjectCollectionRef(userId, projectId, collectionName), id);
    }

    private static toISO(value: unknown): string {
        if (value instanceof Timestamp) {
            return value.toDate().toISOString();
        }
        if (value && typeof value === 'object' && 'toDate' in value) {
            return (value as Timestamp).toDate().toISOString();
        }
        if (typeof value === 'string') {
            return value;
        }
        return new Date().toISOString();
    }

    private static async deleteInBatches(docRefs: DocumentReference[]) {
        for (let index = 0; index < docRefs.length; index += this.BATCH_CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = docRefs.slice(index, index + this.BATCH_CHUNK_SIZE);
            chunk.forEach((docRef) => batch.delete(docRef));
            await batch.commit();
        }
    }

    private static normalizePercentWeights(priorityVector: number[]) {
        const weights = priorityVector.map((weight) => Number((weight * 100).toFixed(2)));
        const sumExceptLast = weights
            .slice(0, -1)
            .reduce((sum, weight) => sum + weight, 0);
        if (weights.length > 0) {
            weights[weights.length - 1] = Number((100 - sumExceptLast).toFixed(2));
        }
        return weights;
    }

    private static async resetMatricesForParentIds(
        userId: string,
        projectId: string,
        level: AHPMatrixLevel,
        parentIds: string[]
    ): Promise<void> {
        const parentSet = new Set(parentIds);
        const matrices = await this.getMatricesByProject(userId, projectId);
        const refs = matrices
            .filter((matrix) => matrix.level === level && parentSet.has(matrix.parentId ?? ''))
            .map((matrix) =>
                this.getProjectDocRef(userId, projectId, 'ahpPairwiseMatrices', matrix.id)
            );
        await this.deleteInBatches(refs);
    }

    private static async syncProjectWeightsFromMatrix(
        userId: string,
        projectId: string,
        matrixData: MatrixSaveData,
        priorityVector: number[]
    ): Promise<void> {
        if (matrixData.level === 'criteria') {
            const batch = writeBatch(db);
            (matrixData.criteriaIds ?? []).forEach((criterionId, index) => {
                batch.update(this.getProjectDocRef(userId, projectId, 'ahpCriteria', criterionId), {
                    weight: priorityVector[index] ?? 0,
                });
            });
            await batch.commit();
            return;
        }

        if (matrixData.level === 'sub_criteria' && matrixData.parentId) {
            const criteria = await this.getCriteria(userId, projectId);
            const parentWeight =
                criteria.find((criterion) => criterion.id === matrixData.parentId)?.weight ?? 0;
            const batch = writeBatch(db);
            (matrixData.criteriaIds ?? []).forEach((subCriterionId, index) => {
                const localWeight = priorityVector[index] ?? 0;
                batch.update(
                    this.getProjectDocRef(userId, projectId, 'ahpSubCriteria', subCriterionId),
                    {
                        localWeight,
                        globalWeight: localWeight * parentWeight,
                    }
                );
            });
            await batch.commit();
        }
    }

    private static mapWeightingSession(docId: string, data: any): AHPWeightingSession {
        return {
            id: docId,
            groupId: data.groupId ?? '',
            criteriaIds: data.criteriaIds ?? [],
            criteriaNames: data.criteriaNames ?? [],
            pairwiseMatrix: data.pairwiseMatrix ?? [],
            normalizedMatrix: data.normalizedMatrix ?? [],
            columnSums: data.columnSums ?? [],
            priorityVector: data.priorityVector ?? [],
            weightedSumVector: data.weightedSumVector ?? [],
            consistencyVector: data.consistencyVector ?? [],
            lambdaMax: data.lambdaMax ?? 0,
            ci: data.ci ?? 0,
            ri: data.ri ?? 0,
            cr: data.cr ?? 0,
            isConsistent: !!data.isConsistent,
            appliedAt: data.appliedAt ? this.toISO(data.appliedAt) : null,
            createdAt: this.toISO(data.createdAt),
            updatedAt: this.toISO(data.updatedAt),
        };
    }

    private static mapProject(docId: string, data: any): AHPProject {
        return {
            id: docId,
            name: data.name ?? '',
            goal: data.goal ?? '',
            status: data.status ?? 'draft',
            hasSub: !!data.hasSub,
            currentStep: data.currentStep ?? 1,
            createdAt: this.toISO(data.createdAt),
            updatedAt: this.toISO(data.updatedAt),
        };
    }

    private static mapCriterion(docId: string, projectId: string, data: any): AHPCriterion {
        return {
            id: docId,
            projectId,
            name: data.name ?? '',
            order: data.order ?? 0,
            weight: data.weight ?? 0,
            createdAt: this.toISO(data.createdAt),
        };
    }

    private static mapSubCriterion(docId: string, projectId: string, data: any): AHPSubCriterion {
        return {
            id: docId,
            projectId,
            criterionId: data.criterionId ?? '',
            name: data.name ?? '',
            order: data.order ?? 0,
            localWeight: data.localWeight ?? 0,
            globalWeight: data.globalWeight ?? 0,
            createdAt: this.toISO(data.createdAt),
        };
    }

    private static mapAlternative(docId: string, projectId: string, data: any): AHPAlternative {
        return {
            id: docId,
            projectId,
            name: data.name ?? '',
            order: data.order ?? 0,
            createdAt: this.toISO(data.createdAt),
        };
    }

    private static mapMatrix(docId: string, projectId: string, data: any): AHPMatrix {
        return {
            id: docId,
            projectId,
            level: data.level ?? 'criteria',
            parentId: data.parentId ?? null,
            criteriaIds: data.criteriaIds ?? [],
            alternativeIds: data.alternativeIds ?? [],
            matrix: data.matrix ?? [],
            normalizedMatrix: data.normalizedMatrix ?? [],
            columnSums: data.columnSums ?? [],
            priorityVector: data.priorityVector ?? [],
            weightedSumVector: data.weightedSumVector ?? [],
            consistencyVector: data.consistencyVector ?? [],
            lambdaMax: data.lambdaMax ?? 0,
            ci: data.ci ?? 0,
            ri: data.ri ?? 0,
            cr: data.cr ?? 0,
            isConsistent: !!data.isConsistent,
            updatedAt: this.toISO(data.updatedAt),
        };
    }

    static async createWeightingSession(
        userId: string,
        groupId: string,
        criteriaIds: string[],
        criteriaNames: string[] = []
    ): Promise<string> {
        const pairwiseMatrix = createDefaultMatrix(criteriaIds.length);
        const analysis = analyzeAHPMatrix(pairwiseMatrix);
        const now = Timestamp.now();
        const docRef = await addDoc(this.getWeightingSessionsRef(userId), {
            groupId,
            criteriaIds,
            criteriaNames,
            pairwiseMatrix,
            ...analysis,
            appliedAt: null,
            createdAt: now,
            updatedAt: now,
        });

        return docRef.id;
    }

    static async getWeightingSessionByGroup(
        userId: string,
        groupId: string
    ): Promise<AHPWeightingSession | null> {
        const q = query(this.getWeightingSessionsRef(userId), where('groupId', '==', groupId));
        const snapshot = await getDocs(q);
        const sessions = snapshot.docs
            .map((document) => this.mapWeightingSession(document.id, document.data()))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

        return sessions[0] ?? null;
    }

    static async updatePairwiseMatrix(
        userId: string,
        sessionId: string,
        matrix: number[][]
    ) {
        const analysis = analyzeAHPMatrix(matrix);
        await updateDoc(doc(this.getWeightingSessionsRef(userId), sessionId), {
            pairwiseMatrix: matrix,
            ...analysis,
            updatedAt: Timestamp.now(),
        });

        return analysis;
    }

    static async applyWeightsToGroup(userId: string, sessionId: string): Promise<void> {
        const sessionSnap = await getDoc(doc(this.getWeightingSessionsRef(userId), sessionId));
        if (!sessionSnap.exists()) {
            throw new Error('AHP weighting session not found');
        }

        const session = this.mapWeightingSession(sessionSnap.id, sessionSnap.data());
        const weights = this.normalizePercentWeights(session.priorityVector);
        const batch = writeBatch(db);

        session.criteriaIds.forEach((criterionId, index) => {
            batch.update(doc(this.getCriteriaRef(userId), criterionId), {
                weight: weights[index] ?? 0,
            });
        });

        batch.update(sessionSnap.ref, {
            appliedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        await batch.commit();
    }

    static async getProjects(userId: string): Promise<AHPProject[]> {
        const snapshot = await getDocs(this.getProjectsRef(userId));
        return snapshot.docs
            .map((document) => this.mapProject(document.id, document.data()))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    static async getProject(userId: string, projectId: string): Promise<AHPProject | null> {
        const snapshot = await getDoc(this.getProjectRef(userId, projectId));
        if (!snapshot.exists()) {
            return null;
        }
        return this.mapProject(snapshot.id, snapshot.data());
    }

    static async createProject(
        userId: string,
        name: string,
        goal: string,
        hasSub: boolean
    ): Promise<string> {
        const now = Timestamp.now();
        const docRef = await addDoc(this.getProjectsRef(userId), {
            name,
            goal,
            status: 'draft',
            hasSub,
            currentStep: 1,
            createdAt: now,
            updatedAt: now,
        });

        return docRef.id;
    }

    static async updateProject(
        userId: string,
        projectId: string,
        data: Partial<Pick<AHPProject, 'name' | 'goal' | 'hasSub' | 'status' | 'currentStep'>>
    ): Promise<void> {
        await updateDoc(this.getProjectRef(userId, projectId), {
            ...data,
            updatedAt: Timestamp.now(),
        });
    }

    static async deleteProject(userId: string, projectId: string): Promise<void> {
        const subcollections = [
            'ahpCriteria',
            'ahpSubCriteria',
            'ahpAlternatives',
            'ahpPairwiseMatrices',
            'ahpResults',
        ];
        const snapshots = await Promise.all(
            subcollections.map((collectionName) =>
                getDocs(this.getProjectCollectionRef(userId, projectId, collectionName))
            )
        );
        const refs = snapshots.flatMap((snapshot) => snapshot.docs.map((item) => item.ref));
        await this.deleteInBatches(refs);
        await deleteDoc(this.getProjectRef(userId, projectId));
    }

    static async getCriteria(userId: string, projectId: string): Promise<AHPCriterion[]> {
        const snapshot = await getDocs(
            this.getProjectCollectionRef(userId, projectId, 'ahpCriteria')
        );
        return snapshot.docs
            .map((document) => this.mapCriterion(document.id, projectId, document.data()))
            .sort((a, b) => a.order - b.order);
    }

    static async addCriteria(
        userId: string,
        projectId: string,
        name: string
    ): Promise<string> {
        const criteria = await this.getCriteria(userId, projectId);
        const docRef = await addDoc(
            this.getProjectCollectionRef(userId, projectId, 'ahpCriteria'),
            {
                name,
                order: criteria.length,
                weight: 0,
                createdAt: Timestamp.now(),
            }
        );
        await this.resetMatricesForLevel(userId, projectId, 'criteria');
        await this.resetMatricesForLevel(userId, projectId, 'alternative_per_criterion');
        return docRef.id;
    }

    static async deleteCriteria(
        userId: string,
        projectId: string,
        criterionId: string
    ): Promise<void> {
        await deleteDoc(this.getProjectDocRef(userId, projectId, 'ahpCriteria', criterionId));

        const subCriteria = await this.getSubCriteria(userId, projectId);
        const childSubRefs = subCriteria
            .filter((item) => item.criterionId === criterionId)
            .map((item) => this.getProjectDocRef(userId, projectId, 'ahpSubCriteria', item.id));
        const childSubIds = subCriteria
            .filter((item) => item.criterionId === criterionId)
            .map((item) => item.id);
        await this.deleteInBatches(childSubRefs);
        await this.resetMatricesForLevel(userId, projectId, 'criteria');
        await this.resetMatricesForLevel(userId, projectId, 'sub_criteria', criterionId);
        await this.resetMatricesForParentIds(userId, projectId, 'alternative_per_sub', childSubIds);
        await this.resetMatricesForLevel(userId, projectId, 'alternative_per_criterion');
    }

    static async reorderCriteria(
        userId: string,
        projectId: string,
        orderedIds: string[]
    ): Promise<void> {
        const batch = writeBatch(db);
        orderedIds.forEach((id, order) => {
            batch.update(this.getProjectDocRef(userId, projectId, 'ahpCriteria', id), { order });
        });
        await batch.commit();
    }

    static async getSubCriteria(userId: string, projectId: string): Promise<AHPSubCriterion[]> {
        const snapshot = await getDocs(
            this.getProjectCollectionRef(userId, projectId, 'ahpSubCriteria')
        );
        return snapshot.docs
            .map((document) => this.mapSubCriterion(document.id, projectId, document.data()))
            .sort((a, b) => a.order - b.order);
    }

    static async addSubCriteria(
        userId: string,
        projectId: string,
        criterionId: string,
        name: string
    ): Promise<string> {
        const subCriteria = await this.getSubCriteria(userId, projectId);
        const siblings = subCriteria.filter((item) => item.criterionId === criterionId);
        const docRef = await addDoc(
            this.getProjectCollectionRef(userId, projectId, 'ahpSubCriteria'),
            {
                criterionId,
                name,
                order: siblings.length,
                localWeight: 0,
                globalWeight: 0,
                createdAt: Timestamp.now(),
            }
        );
        await this.resetMatricesForLevel(userId, projectId, 'sub_criteria', criterionId);
        await this.resetMatricesForParentIds(userId, projectId, 'alternative_per_sub', [
            ...siblings.map((item) => item.id),
            docRef.id,
        ]);
        return docRef.id;
    }

    static async deleteSubCriteria(
        userId: string,
        projectId: string,
        subId: string
    ): Promise<void> {
        const subRef = this.getProjectDocRef(userId, projectId, 'ahpSubCriteria', subId);
        const snapshot = await getDoc(subRef);
        const criterionId = snapshot.exists() ? snapshot.data().criterionId : null;
        await deleteDoc(subRef);
        if (criterionId) {
            await this.resetMatricesForLevel(userId, projectId, 'sub_criteria', criterionId);
            await this.resetMatricesForLevel(userId, projectId, 'alternative_per_sub', subId);
        }
    }

    static async getAlternatives(userId: string, projectId: string): Promise<AHPAlternative[]> {
        const snapshot = await getDocs(
            this.getProjectCollectionRef(userId, projectId, 'ahpAlternatives')
        );
        return snapshot.docs
            .map((document) => this.mapAlternative(document.id, projectId, document.data()))
            .sort((a, b) => a.order - b.order);
    }

    static async addAlternative(
        userId: string,
        projectId: string,
        name: string
    ): Promise<string> {
        const alternatives = await this.getAlternatives(userId, projectId);
        const docRef = await addDoc(
            this.getProjectCollectionRef(userId, projectId, 'ahpAlternatives'),
            {
                name,
                order: alternatives.length,
                createdAt: Timestamp.now(),
            }
        );
        await this.resetMatricesForLevel(userId, projectId, 'alternative_per_criterion');
        await this.resetMatricesForLevel(userId, projectId, 'alternative_per_sub');
        return docRef.id;
    }

    static async deleteAlternative(
        userId: string,
        projectId: string,
        altId: string
    ): Promise<void> {
        await deleteDoc(this.getProjectDocRef(userId, projectId, 'ahpAlternatives', altId));
        await this.resetMatricesForLevel(userId, projectId, 'alternative_per_criterion');
        await this.resetMatricesForLevel(userId, projectId, 'alternative_per_sub');
    }

    static async saveMatrix(
        userId: string,
        projectId: string,
        matrixData: MatrixSaveData
    ): Promise<string> {
        const analysis = analyzeAHPMatrix(matrixData.matrix);
        const payload = {
            level: matrixData.level,
            parentId: matrixData.parentId ?? null,
            criteriaIds: matrixData.criteriaIds ?? [],
            alternativeIds: matrixData.alternativeIds ?? [],
            matrix: matrixData.matrix,
            ...analysis,
            updatedAt: Timestamp.now(),
        };

        if (matrixData.id) {
            await updateDoc(
                this.getProjectDocRef(userId, projectId, 'ahpPairwiseMatrices', matrixData.id),
                payload
            );
            await this.syncProjectWeightsFromMatrix(
                userId,
                projectId,
                matrixData,
                analysis.priorityVector
            );
            return matrixData.id;
        }

        const existing = await this.findMatrix(
            userId,
            projectId,
            matrixData.level,
            matrixData.parentId ?? null
        );

        if (existing) {
            await updateDoc(
                this.getProjectDocRef(userId, projectId, 'ahpPairwiseMatrices', existing.id),
                payload
            );
            await this.syncProjectWeightsFromMatrix(
                userId,
                projectId,
                matrixData,
                analysis.priorityVector
            );
            return existing.id;
        }

        const docRef = await addDoc(
            this.getProjectCollectionRef(userId, projectId, 'ahpPairwiseMatrices'),
            payload
        );
        await this.syncProjectWeightsFromMatrix(
            userId,
            projectId,
            matrixData,
            analysis.priorityVector
        );
        return docRef.id;
    }

    static async getMatricesByProject(userId: string, projectId: string): Promise<AHPMatrix[]> {
        const snapshot = await getDocs(
            this.getProjectCollectionRef(userId, projectId, 'ahpPairwiseMatrices')
        );
        return snapshot.docs.map((document) =>
            this.mapMatrix(document.id, projectId, document.data())
        );
    }

    static async findMatrix(
        userId: string,
        projectId: string,
        level: AHPMatrixLevel,
        parentId: string | null = null
    ): Promise<AHPMatrix | null> {
        const matrices = await this.getMatricesByProject(userId, projectId);
        return (
            matrices.find(
                (matrix) => matrix.level === level && (matrix.parentId ?? null) === parentId
            ) ?? null
        );
    }

    static async resetMatricesForLevel(
        userId: string,
        projectId: string,
        level: AHPMatrixLevel,
        parentId?: string | null
    ): Promise<void> {
        const matrices = await this.getMatricesByProject(userId, projectId);
        const refs = matrices
            .filter(
                (matrix) =>
                    matrix.level === level &&
                    (parentId === undefined || (matrix.parentId ?? null) === parentId)
            )
            .map((matrix) =>
                this.getProjectDocRef(userId, projectId, 'ahpPairwiseMatrices', matrix.id)
            );
        await this.deleteInBatches(refs);
    }

    static async computeAndSaveResults(
        userId: string,
        projectId: string
    ): Promise<AHPGlobalResult[]> {
        const [project, criteria, subCriteria, alternatives, matrices] = await Promise.all([
            this.getProject(userId, projectId),
            this.getCriteria(userId, projectId),
            this.getSubCriteria(userId, projectId),
            this.getAlternatives(userId, projectId),
            this.getMatricesByProject(userId, projectId),
        ]);

        if (!project) {
            throw new Error('AHP project not found');
        }
        if (criteria.length === 0 || alternatives.length === 0) {
            return [];
        }

        const criteriaMatrix = matrices.find((matrix) => matrix.level === 'criteria');
        const criteriaWeights =
            criteriaMatrix?.priorityVector.length === criteria.length
                ? criteriaMatrix.priorityVector
                : criteria.map((criterion) => criterion.weight);

        let scorePerAlternative = Array.from({ length: alternatives.length }, () => 0);
        const scorePerCriteriaByAlternative: Array<Record<string, number>> = alternatives.map(
            () => ({})
        );

        if (project.hasSub) {
            criteria.forEach((criterion, criteriaIndex) => {
                const children = subCriteria.filter((item) => item.criterionId === criterion.id);
                if (children.length === 0) {
                    const altMatrix = matrices.find(
                        (matrix) =>
                            matrix.level === 'alternative_per_criterion' &&
                            matrix.parentId === criterion.id
                    );
                    const localPriorities = altMatrix?.priorityVector ?? [];
                    localPriorities.forEach((priority, alternativeIndex) => {
                        const contribution = criteriaWeights[criteriaIndex] * priority;
                        scorePerAlternative[alternativeIndex] += contribution;
                        scorePerCriteriaByAlternative[alternativeIndex][criterion.id] = contribution;
                    });
                    return;
                }

                const subMatrix = matrices.find(
                    (matrix) =>
                        matrix.level === 'sub_criteria' &&
                        matrix.parentId === criterion.id
                );
                const subWeights = subMatrix?.priorityVector ?? [];
                children.forEach((subCriterion, subIndex) => {
                    const altMatrix = matrices.find(
                        (matrix) =>
                            matrix.level === 'alternative_per_sub' &&
                            matrix.parentId === subCriterion.id
                    );
                    const globalWeight =
                        criteriaWeights[criteriaIndex] * (subWeights[subIndex] ?? 0);
                    (altMatrix?.priorityVector ?? []).forEach((priority, alternativeIndex) => {
                        const contribution = globalWeight * priority;
                        scorePerAlternative[alternativeIndex] += contribution;
                        scorePerCriteriaByAlternative[alternativeIndex][criterion.id] =
                            (scorePerCriteriaByAlternative[alternativeIndex][criterion.id] ?? 0) +
                            contribution;
                    });
                });
            });
        } else {
            const alternativeVectors = criteria.map((criterion) => {
                const matrix = matrices.find(
                    (item) =>
                        item.level === 'alternative_per_criterion' &&
                        item.parentId === criterion.id
                );
                return matrix?.priorityVector ?? Array.from({ length: alternatives.length }, () => 0);
            });
            scorePerAlternative = computeGlobalPriorities(criteriaWeights, alternativeVectors);
            criteria.forEach((criterion, criteriaIndex) => {
                alternativeVectors[criteriaIndex].forEach((priority, alternativeIndex) => {
                    scorePerCriteriaByAlternative[alternativeIndex][criterion.id] =
                        criteriaWeights[criteriaIndex] * priority;
                });
            });
        }

        const results = alternatives
            .map((alternative, index) => ({
                alternativeId: alternative.id,
                alternativeName: alternative.name,
                globalScore: scorePerAlternative[index] ?? 0,
                rank: 0,
                scorePerCriteria: scorePerCriteriaByAlternative[index] ?? {},
            }))
            .sort((a, b) => b.globalScore - a.globalScore)
            .map((result, index) => ({ ...result, rank: index + 1 }));

        const batch = writeBatch(db);
        results.forEach((result) => {
            batch.set(
                this.getProjectDocRef(userId, projectId, 'ahpResults', result.alternativeId),
                result
            );
        });
        batch.update(this.getProjectRef(userId, projectId), {
            status: 'complete',
            currentStep: 8,
            updatedAt: Timestamp.now(),
        });
        await batch.commit();

        return results;
    }

    static async getProjectResults(
        userId: string,
        projectId: string
    ): Promise<AHPGlobalResult[] | null> {
        const snapshot = await getDocs(
            this.getProjectCollectionRef(userId, projectId, 'ahpResults')
        );

        if (snapshot.empty) {
            return null;
        }

        return snapshot.docs
            .map((document) => document.data() as AHPGlobalResult)
            .sort((a, b) => a.rank - b.rank);
    }
}
