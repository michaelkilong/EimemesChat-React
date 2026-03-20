export type View = 'chat' | 'settings' | 'profile';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
  model?: string;
  disclaimer?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

export interface ToastState {
  message: string;
  visible: boolean;
}
