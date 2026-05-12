import type { Request } from 'express';

// Auth removed — all routes are public, no JWT required.
export type AuthRequest = Request;
