import * as SQLite from 'expo-sqlite';
import { ALL_TABLES } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    if (db) {
        return db;
    }

    db = await SQLite.openDatabaseAsync('promoteai.db');

    // Create tables
    for (const tableSQL of ALL_TABLES) {
        await db.execAsync(tableSQL);
    }

    console.log('Database initialized successfully');
    return db;
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
};

export const closeDatabase = async (): Promise<void> => {
    if (db) {
        await db.closeAsync();
        db = null;
    }
};
