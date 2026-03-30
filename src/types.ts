import { Timestamp } from 'firebase/firestore';

export type MediaType = 'image' | 'video' | 'file';

export interface Post {
  id: string;
  authorId: string;
  authorName?: string;
  authorPhoto?: string;
  title: string;
  description?: string;
  type: MediaType;
  content: string; // Base64 or URL
  fileName?: string;
  fileSize?: number;
  createdAt: Timestamp;
  likes?: number;
}

export interface UserProfile {
  uid: string;
  displayName?: string;
  email: string;
  photoURL?: string;
  bio?: string;
  createdAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
