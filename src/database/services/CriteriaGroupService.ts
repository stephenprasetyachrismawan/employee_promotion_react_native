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
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { CriteriaGroup } from '../../types';
import { CriteriaService } from './CriteriaService';

export class CriteriaGroupService {
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

    static async getAll(userId: string): Promise<CriteriaGroup[]> {
        const q = query(this.getCollectionRef(userId), orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            description: doc.data().description ?? null,
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
            createdAt: docSnap.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        };
    }

    static async create(userId: string, name: string, description?: string): Promise<string> {
        const docRef = await addDoc(this.getCollectionRef(userId), {
            name,
            description: description ?? null,
            createdAt: Timestamp.now(),
        });

        return docRef.id;
    }

    static async update(
        userId: string,
        id: string,
        name: string,
        description?: string
    ): Promise<void> {
        const docRef = doc(this.getCollectionRef(userId), id);
        await updateDoc(docRef, {
            name,
            description: description ?? null,
        });
    }

    static async delete(userId: string, id: string): Promise<void> {
        const groupRef = doc(this.getCollectionRef(userId), id);
        await deleteDoc(groupRef);

        const criteriaQuery = query(this.getCriteriaRef(userId), where('groupId', '==', id));
        const criteriaSnapshot = await getDocs(criteriaQuery);
        await Promise.all(criteriaSnapshot.docs.map(doc => deleteDoc(doc.ref)));

        const candidatesQuery = query(this.getCandidatesRef(userId), where('groupId', '==', id));
        const candidatesSnapshot = await getDocs(candidatesQuery);
        await Promise.all(
            candidatesSnapshot.docs.map(async candidateDoc => {
                const candidateId = candidateDoc.id;
                await deleteDoc(candidateDoc.ref);

                const valuesQuery = query(
                    this.getCandidateValuesRef(userId),
                    where('candidateId', '==', candidateId)
                );
                const valuesSnapshot = await getDocs(valuesQuery);
                await Promise.all(valuesSnapshot.docs.map(doc => deleteDoc(doc.ref)));
            })
        );
    }

    static async duplicate(userId: string, id: string): Promise<string> {
        const [group, criteria] = await Promise.all([
            this.getById(userId, id),
            CriteriaService.getByGroup(userId, id),
        ]);

        if (!group) {
            throw new Error('Criteria group not found');
        }

        const newGroupId = await this.create(
            userId,
            `${group.name} (Copy)`,
            group.description ?? undefined
        );

        await Promise.all(
            criteria.map((criterion) =>
                addDoc(this.getCriteriaRef(userId), {
                    groupId: newGroupId,
                    name: criterion.name,
                    dataType: criterion.dataType,
                    impactType: criterion.impactType,
                    weight: criterion.weight ?? 0,
                    createdAt: Timestamp.now(),
                })
            )
        );

        return newGroupId;
    }
}
