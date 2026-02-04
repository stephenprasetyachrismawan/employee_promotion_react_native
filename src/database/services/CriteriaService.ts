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
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Criterion, DataType, ImpactType } from '../../types';
import { WeightService } from './WeightService';

export class CriteriaService {
    private static getCollectionRef(userId: string) {
        return collection(db, 'users', userId, 'criteria');
    }

    static async getAll(userId: string): Promise<Criterion[]> {
        const q = query(this.getCollectionRef(userId), orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            dataType: doc.data().dataType,
            impactType: doc.data().impactType,
            createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        }));
    }

    static async getById(userId: string, id: string): Promise<Criterion | null> {
        const docRef = doc(this.getCollectionRef(userId), id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return {
            id: docSnap.id,
            name: docSnap.data().name,
            dataType: docSnap.data().dataType,
            impactType: docSnap.data().impactType,
            createdAt: docSnap.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        };
    }

    static async create(
        userId: string,
        name: string,
        dataType: DataType,
        impactType: ImpactType
    ): Promise<string> {
        const docRef = await addDoc(this.getCollectionRef(userId), {
            name,
            dataType,
            impactType,
            createdAt: Timestamp.now(),
        });

        // Create corresponding weight entry
        await WeightService.create(userId, docRef.id);

        return docRef.id;
    }

    static async update(
        userId: string,
        id: string,
        name: string,
        dataType: DataType,
        impactType: ImpactType
    ): Promise<void> {
        const docRef = doc(this.getCollectionRef(userId), id);
        await updateDoc(docRef, {
            name,
            dataType,
            impactType,
        });
    }

    static async delete(userId: string, id: string): Promise<void> {
        // Delete the criterion
        const docRef = doc(this.getCollectionRef(userId), id);
        await deleteDoc(docRef);

        // Delete associated weight
        await WeightService.delete(userId, id);

        // Note: Candidate values will be orphaned but that's okay for now
        // In production, you might want to clean those up too
    }

    static async count(userId: string): Promise<number> {
        const snapshot = await getDocs(this.getCollectionRef(userId));
        return snapshot.size;
    }
}
