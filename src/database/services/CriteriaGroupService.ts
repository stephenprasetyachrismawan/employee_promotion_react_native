import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    Timestamp,
    DocumentReference,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { CriteriaGroup, DecisionMethod } from '../../types';
import { CriteriaService } from './CriteriaService';

export class CriteriaGroupService {
    private static readonly BATCH_CHUNK_SIZE = 450;

    private static getCollectionRef(userId: string) {
        return collection(db, 'users', userId, 'criteriaGroups');
    }

    private static getCriteriaRef(userId: string) {
        return collection(db, 'users', userId, 'criteria');
    }

    private static getCandidatesRef(userId: string) {
        return collection(db, 'users', userId, 'candidates');
    }

    private static getCandidateValuesRef(userId: string) {
        return collection(db, 'users', userId, 'candidateValues');
    }

    private static async deleteInBatches(docRefs: DocumentReference[]) {
        for (let index = 0; index < docRefs.length; index += this.BATCH_CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = docRefs.slice(index, index + this.BATCH_CHUNK_SIZE);
            chunk.forEach((docRef) => batch.delete(docRef));
            await batch.commit();
        }
    }

    private static async setInBatches(
        docs: Array<{ ref: DocumentReference; data: Record<string, unknown> }>
    ) {
        for (let index = 0; index < docs.length; index += this.BATCH_CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = docs.slice(index, index + this.BATCH_CHUNK_SIZE);
            chunk.forEach(({ ref, data }) => batch.set(ref, data));
            await batch.commit();
        }
    }

    static async getAll(userId: string): Promise<CriteriaGroup[]> {
        const q = query(this.getCollectionRef(userId), orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            description: doc.data().description ?? null,
            method: (doc.data().method as DecisionMethod) ?? 'WPM',
            groupType: (doc.data().groupType as CriteriaGroup['groupType']) ?? null,
            sourceGroupId: doc.data().sourceGroupId ?? null,
            createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        }));
    }

    static async getById(userId: string, id: string): Promise<CriteriaGroup | null> {
        const docRef = doc(this.getCollectionRef(userId), id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return {
            id: docSnap.id,
            name: docSnap.data().name,
            description: docSnap.data().description ?? null,
            method: (docSnap.data().method as DecisionMethod) ?? 'WPM',
            groupType: (docSnap.data().groupType as CriteriaGroup['groupType']) ?? null,
            sourceGroupId: docSnap.data().sourceGroupId ?? null,
            createdAt: docSnap.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        };
    }

    static async getAllByType(
        userId: string,
        groupType: NonNullable<CriteriaGroup['groupType']>
    ): Promise<CriteriaGroup[]> {
        const groups = await this.getAll(userId);
        if (groupType === 'input') {
            return groups.filter((group) => group.groupType === 'input' || !group.groupType);
        }
        return groups.filter((group) => group.groupType === groupType);
    }

    static async create(
        userId: string,
        name: string,
        description?: string,
        method: DecisionMethod = 'WPM',
        groupType: CriteriaGroup['groupType'] = 'criteria',
        sourceGroupId?: string | null
    ): Promise<string> {
        const docRef = await addDoc(this.getCollectionRef(userId), {
            name,
            description: description ?? null,
            method,
            groupType,
            sourceGroupId: sourceGroupId ?? null,
            createdAt: Timestamp.now(),
        });

        return docRef.id;
    }

    static async update(
        userId: string,
        id: string,
        name: string,
        description?: string,
        method?: DecisionMethod
    ): Promise<void> {
        const docRef = doc(this.getCollectionRef(userId), id);
        const payload: Record<string, unknown> = {
            name,
            description: description ?? null,
        };
        if (method) {
            payload.method = method;
        }
        await updateDoc(docRef, payload);
    }

    static async delete(userId: string, id: string): Promise<void> {
        const groupRef = doc(this.getCollectionRef(userId), id);
        const criteriaQuery = query(this.getCriteriaRef(userId), where('groupId', '==', id));
        const candidatesQuery = query(this.getCandidatesRef(userId), where('groupId', '==', id));
        const [criteriaSnapshot, candidatesSnapshot] = await Promise.all([
            getDocs(criteriaQuery),
            getDocs(candidatesQuery),
        ]);

        const valuesSnapshots = await Promise.all(
            candidatesSnapshot.docs.map((candidateDoc) => {
                const valuesQuery = query(
                    this.getCandidateValuesRef(userId),
                    where('candidateId', '==', candidateDoc.id)
                );
                return getDocs(valuesQuery);
            })
        );

        const docsToDelete: DocumentReference[] = [
            ...criteriaSnapshot.docs.map((criteriaDoc) => criteriaDoc.ref),
            ...valuesSnapshots.flatMap((valuesSnapshot) =>
                valuesSnapshot.docs.map((valueDoc) => valueDoc.ref)
            ),
            ...candidatesSnapshot.docs.map((candidateDoc) => candidateDoc.ref),
        ];

        await this.deleteInBatches(docsToDelete);

        await deleteDoc(groupRef);
    }

    static async duplicate(
        userId: string,
        id: string,
        groupTypeOverride?: NonNullable<CriteriaGroup['groupType']>
    ): Promise<string> {
        const [group, criteria] = await Promise.all([
            this.getById(userId, id),
            CriteriaService.getByGroup(userId, id),
        ]);

        if (!group) {
            throw new Error('Criteria group not found');
        }

        const targetGroupType = groupTypeOverride ?? group.groupType ?? 'criteria';

        const newGroupId = await this.create(
            userId,
            `${group.name} (Copy)`,
            group.description ?? undefined,
            group.method ?? 'WPM',
            targetGroupType,
            group.sourceGroupId ?? null
        );

        const docsToCreate = criteria.map((criterion) => ({
            ref: doc(this.getCriteriaRef(userId)),
            data: {
                groupId: newGroupId,
                name: criterion.name,
                dataType: criterion.dataType,
                impactType: criterion.impactType,
                weight: criterion.weight ?? 0,
                createdAt: Timestamp.now(),
            },
        }));

        await this.setInBatches(docsToCreate);

        return newGroupId;
    }

    static async createInputGroupFromTemplate(
        userId: string,
        name: string,
        description: string | undefined,
        method: DecisionMethod,
        templateGroupId: string
    ): Promise<string> {
        const criteria = await CriteriaService.getByGroup(userId, templateGroupId);
        if (criteria.length === 0) {
            throw new Error('Template group has no criteria');
        }

        const newGroupRef = doc(this.getCollectionRef(userId));
        const docsToCreate = [
            {
                ref: newGroupRef,
                data: {
                    name,
                    description: description ?? null,
                    method,
                    groupType: 'input',
                    sourceGroupId: templateGroupId,
                    createdAt: Timestamp.now(),
                },
            },
            ...criteria.map((criterion) => ({
                ref: doc(this.getCriteriaRef(userId)),
                data: {
                    groupId: newGroupRef.id,
                    name: criterion.name,
                    dataType: criterion.dataType,
                    impactType: criterion.impactType,
                    weight: criterion.weight ?? 0,
                    createdAt: Timestamp.now(),
                },
            })),
        ];

        await this.setInBatches(docsToCreate);
        return newGroupRef.id;
    }
}
