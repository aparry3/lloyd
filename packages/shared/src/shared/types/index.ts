export type Channel = 'sms' | 'rcs' | 'whatsapp' | 'email';

export interface IncomingMessage {
  id: string;
  channel: Channel;
  from: string;           // phone number or email
  to: string;             // our number or email
  body: string;
  mediaUrls?: string[];
  timestamp: Date;
  rawPayload: Record<string, unknown>;
}

export interface OutgoingMessage {
  channel: Channel;
  to: string;
  body: string;
  mediaUrls?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferredChannel: Channel;
  agentId?: string;       // which agent config to route to
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  model: string;
  tools?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  agentId: string;
  channel: Channel;
  startedAt: Date;
  lastMessageAt: Date;
}
