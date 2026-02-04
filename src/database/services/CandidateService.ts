import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Candidate, CandidateWithValues } from '../../types';

export class CandidateService {
    private static getCandidatesRef(userId: string) {
        return collection(db, 'users', userId, 'candidates');
    }

    private static getValuesRef(userId: string) {
        return collection(db, 'users', userId, 'candidateValues');
    }

    static async getAll(userId: string): Promise<Candidate[]> {
        const q = query(this.getCandidatesRef(userId), orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        }));
    }

    static async getAllWithValues(userId: string): Promise<CandidateWithValues[]> {
        const candidates = await this.getAll(userId);

        const candidatesWithValues = await Promise.all(
            candidates.map(async (candidate) => {
                const values = await this.getValues(userId, candidate.id);
                return {
                    ...candidate,
                    values,
                };
            })
        );

        return candidatesWithValues;
    }

    static async getWithValues(userId: string, id: string): Promise<CandidateWithValues | null> {
        const docRef = doc(this.getCandidatesRef(userId), id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        const values = await this.getValues(userId, id);

        return {
            id: docSnap.id,
            name: docSnap.data().name,
            createdAt: docSnap.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
            values,
        };
    }

    private static async getValues(userId: string, candidateId: string) {
        const q = query(
            this.getValuesRef(userId),
            where('candidateId', '==', candidateId)
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            candidateId: doc.data().candidateId,
            criterionId: doc.data().criterionId,
            value: doc.data().value,
        }));
    }

    static async create(
        userId: string,
        name: string,
        values: Array<{ criterionId: string; value: number }>
    ): Promise<string> {
        // Create candidate
        const candidateRef = await addDoc(this.getCandidatesRef(userId), {
            name,
            createdAt: Timestamp.now(),
        });

        // Create values
        const valuePromises = values.map(v =>
            addDoc(this.getValuesRef(userId), {
                candidateId: candidateRef.id,
                criterionId: v.criterionId,
                value: v.value,
            })
        );

        await Promise.all(valuePromises);

        return candidateRef.id;
    }

    static async update(
        userId: string,
        id: string,
        name: string,
        values: Array<{ criterionId: string; value: number }>
    ): Promise<void> {
        // Update candidate name
        const candidateRef = doc(this.getCandidatesRef(userId), id);
        await updateDoc(candidateRef, { name });

        // Delete old values
        const oldValuesQuery = query(
            this.getValuesRef(userId),
            where('candidateId', '==', id)
        );
        const oldValuesSnapshot = await getDocs(oldValuesQuery);
        const deletePromises = oldValuesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // Create new values
        const valuePromises = values.map(v =>
            addDoc(this.getValuesRef(userId), {
                candidateId: id,
                criterionId: v.criterionId,
                value: v.value,
            })
        );

        await Promise.all(valuePromises);
    }

    static async delete(userId: string, id: string): Promise<void> {
        // Delete candidate
        const candidateRef = doc(this.getCandidatesRef(userId), id);
        await deleteDoc(candidateRef);

        // Delete associated values
        const valuesQuery = query(
            this.getValuesRef(userId),
            where('candidateId', '==', id)
        );
        const valuesSnapshot = await getDocs(valuesQuery);
        const deletePromises = valuesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
    }
}
