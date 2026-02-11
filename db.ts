import { mockSupabase, MockDB } from './mockDb';

// MOCK DATABASE ENABLED
// To switch back to real Supabase:
// 1. Delete this file
// 2. Rename db.real.ts to db.ts

export const supabase = mockSupabase;
export const DB = MockDB;
