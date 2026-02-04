import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Weight } from '../../types';

export class WeightService {
    private static getCollectionRef(userId: string) {
        return collection(db, 'users', userId, 'weights');
    }

    static async getAll(userId: string): Promise<Weight[]> {
        const snapshot = await getDocs(this.getCollectionRef(userId));

        return snapshot.docs.map(doc => ({
            criterionId: doc.id,
            weight: doc.data().weight || 0,
            isLocked: doc.data().isLocked || false,
        }));
    }

    static async getById(userId: string, criterionId: string): Promise<Weight | null> {
        const docRef = doc(this.getCollectionRef(userId), criterionId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return {
            criterionId: docSnap.id,
            weight: docSnap.data().weight || 0,
            isLocked: docSnap.data().isLocked || false,
        };
    }

    static async create(userId: string, criterionId: string): Promise<void> {
        const docRef = doc(this.getCollectionRef(userId), criterionId);
        await setDoc(docRef, {
            weight: 0,
            isLocked: false,
        });
    }

    static async updateWeight(userId: string, criterionId: string, weight: number): Promise<void> {
        const docRef = doc(this.getCollectionRef(userId), criterionId);
        await updateDoc(docRef, { weight });
    }

    static async toggleLock(userId: string, criterionId: string): Promise<void> {
        const weight = await this.getById(userId, criterionId);
        if (!weight) return;

        const docRef = doc(this.getCollectionRef(userId), criterionId);
        await updateDoc(docRef, {
            isLocked: !weight.isLocked,
        });
    }

    static async delete(userId: string, criterionId: string): Promise<void> {
        const docRef = doc(this.getCollectionRef(userId), criterionId);
        await deleteDoc(docRef);
    }

    static async autoBalance(userId: string): Promise<void> {
        const weights = await this.getAll(userId);

        const lockedWeights = weights.filter(w => w.isLocked);
        const unlockedWeights = weights.filter(w => !w.isLocked);

        if (unlockedWeights.length === 0) {
            return;
        }

        const lockedTotal = lockedWeights.reduce((sum, w) => sum + w.weight, 0);
        const remainingWeight = 100 - lockedTotal;
        const distributedWeight = remainingWeight / unlockedWeights.length;

        // Update all unlocked weights
        const updatePromises = unlockedWeights.map(w =>
            this.updateWeight(userId, w.criterionId, distributedWeight)
        );

        await Promise.all(updatePromises);
    }

    static async isValid(userId: string): Promise<boolean> {
        const weights = await this.getAll(userId);
        const total = weights.reduce((sum, w) => sum + w.weight, 0);
        return Math.abs(total - 100) < 0.01;
    }
}
