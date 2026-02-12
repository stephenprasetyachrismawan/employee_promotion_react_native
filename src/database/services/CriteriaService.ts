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
import { Criterion, DataType, ImpactType } from '../../types';

export class CriteriaService {
    private static getCollectionRef(userId: string) {
        return collection(db, 'users', userId, 'criteria');
    }

    static async getAll(userId: string): Promise<Criterion[]> {
        const q = query(this.getCollectionRef(userId), orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            groupId: doc.data().groupId ?? '',
            name: doc.data().name,
            dataType: doc.data().dataType,
            impactType: doc.data().impactType,
            weight: doc.data().weight ?? 0,
            isWeightLocked: !!doc.data().isWeightLocked,
            createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        }));
    }

    static async getByGroup(userId: string, groupId: string): Promise<Criterion[]> {
        try {
            const q = query(
                this.getCollectionRef(userId),
                where('groupId', '==', groupId)
            );
            const snapshot = await getDocs(q);

            return snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    groupId: doc.data().groupId ?? '',
                    name: doc.data().name,
                    dataType: doc.data().dataType,
                    impactType: doc.data().impactType,
                    weight: doc.data().weight ?? 0,
                    isWeightLocked: !!doc.data().isWeightLocked,
                    createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
                }))
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        } catch (error) {
            console.warn('Failed to query criteria by group, falling back to client filter.', error);
            const allCriteria = await this.getAll(userId);
            return allCriteria
                .filter((criterion) => criterion.groupId === groupId)
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        }
    }

    static async getById(userId: string, id: string): Promise<Criterion | null> {
        const docRef = doc(this.getCollectionRef(userId), id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return {
            id: docSnap.id,
            groupId: docSnap.data().groupId ?? '',
            name: docSnap.data().name,
            dataType: docSnap.data().dataType,
            impactType: docSnap.data().impactType,
            weight: docSnap.data().weight ?? 0,
            isWeightLocked: !!docSnap.data().isWeightLocked,
            createdAt: docSnap.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        };
    }

    static async create(
        userId: string,
        groupId: string,
        name: string,
        dataType: DataType,
        impactType: ImpactType,
        weight: number,
        isWeightLocked: boolean = false
    ): Promise<string> {
        const docRef = await addDoc(this.getCollectionRef(userId), {
            groupId,
            name,
            dataType,
            impactType,
            weight,
            isWeightLocked,
            createdAt: Timestamp.now(),
        });

        return docRef.id;
    }

    static async update(
        userId: string,
        id: string,
        name: string,
        dataType: DataType,
        impactType: ImpactType,
        weight: number
    ): Promise<void> {
        const docRef = doc(this.getCollectionRef(userId), id);
        await updateDoc(docRef, {
            name,
            dataType,
            impactType,
            weight,
        });
    }

    static async updateWeight(userId: string, id: string, weight: number): Promise<void> {
        const docRef = doc(this.getCollectionRef(userId), id);
        await updateDoc(docRef, { weight });
    }

    static async updateWeightLock(
        userId: string,
        id: string,
        isWeightLocked: boolean
    ): Promise<void> {
        const docRef = doc(this.getCollectionRef(userId), id);
        await updateDoc(docRef, { isWeightLocked });
    }

    static async delete(userId: string, id: string): Promise<void> {
        // Delete the criterion
        const docRef = doc(this.getCollectionRef(userId), id);
        await deleteDoc(docRef);

        // Note: Candidate values will be orphaned but that's okay for now
        // In production, you might want to clean those up too
    }

    static async count(userId: string): Promise<number> {
        const snapshot = await getDocs(this.getCollectionRef(userId));
        return snapshot.size;
    }

    static async countByGroup(userId: string, groupId: string): Promise<number> {
        const q = query(this.getCollectionRef(userId), where('groupId', '==', groupId));
        const snapshot = await getDocs(q);
        return snapshot.size;
    }
}
