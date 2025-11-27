export enum UserRole {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  CLIENT = 'CLIENT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // For local auth simulation only
  avatarUrl?: string;
}

export interface Bot {
  id: string;
  name: string;
  username: string;
  token: string; // Real Telegram Bot Token
  chatId: string; // Target Group Chat ID
  status: 'ACTIVE' | 'INACTIVE';
  assignedToUserId?: string;
  messagesSentToday: number;
}

export enum PostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export enum PostStatus {
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DRAFT = 'DRAFT'
}

export interface Post {
  id: string;
  botId: string;
  content: string; // Caption or text body
  mediaUrl?: string;
  type: PostType;
  scheduledTime: string; // ISO String
  status: PostStatus;
  repeat: 'NONE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  createdByUserId: string;
}

export interface AnalyticsData {
  name: string;
  sent: number;
  failed: number;
  scheduled: number;
}