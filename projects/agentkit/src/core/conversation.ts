import { v4 as uuidv4 } from 'uuid';
import { Message } from './message';

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

interface ToolOutput {
  toolCallId: string;
  result: any;
}

interface ConversationExport {
  id: string;
  history: Message[];
  summary: string;
  participants: string[];
  metadata: Record<string, any>;
}

export class Conversation {
  id: string;
  history: Message[];
  currentMessages: Message[];
  summary: string;
  participants: string[];
  metadata: Record<string, any>;

  constructor() {
    this.id = uuidv4();
    this.history = [];
    this.currentMessages = [];
    this.summary = '';
    this.participants = [];
    this.metadata = {};
  }

  addMessage(message: Message): void {
    this.history.push(message);
    this.currentMessages.push(message);
  }

  addToolCall(toolCall: ToolCall): void {
    const toolCallMessage: Message = {
      role: 'assistant',
      content: '',
      toolCalls: [toolCall]
    };
    this.history.push(toolCallMessage);
    this.currentMessages.push(toolCallMessage);
  }

  addOutput(output: ToolOutput): void {
    const outputMessage: Message = {
      role: 'tool',
      content: JSON.stringify(output.result),
      toolCallId: output.toolCallId
    };
    this.history.push(outputMessage);
    this.currentMessages.push(outputMessage);
  }

  getHistory(): Message[] {
    return [...this.history];
  }

  getRecent(count: number): Message[] {
    return this.history.slice(-count);
  }

  async summarize(): Promise<string> {
    if (this.history.length === 0) {
      this.summary = 'No conversation history';
      return this.summary;
    }

    const conversationText = this.history
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    this.summary = `Conversation with ${this.history.length} messages between ${this.participants.length} participants`;
    return this.summary;
  }

  getSummary(): string {
    if (!this.summary && this.history.length > 0) {
      this.summarize();
    }
    return this.summary;
  }

  clearCurrent(): void {
    this.currentMessages = [];
  }

  clearHistory(): void {
    this.history = [];
    this.currentMessages = [];
    this.summary = '';
  }

  addParticipant(agentId: string): void {
    if (!this.participants.includes(agentId)) {
      this.participants.push(agentId);
    }
  }

  removeParticipant(agentId: string): boolean {
    const index = this.participants.indexOf(agentId);
    if (index !== -1) {
      this.participants.splice(index, 1);
      return true;
    }
    return false;
  }

  getParticipants(): string[] {
    return [...this.participants];
  }

  export(): ConversationExport {
    return {
      id: this.id,
      history: [...this.history],
      summary: this.summary,
      participants: [...this.participants],
      metadata: { ...this.metadata }
    };
  }

  search(query: string): Message[] {
    const lowerQuery = query.toLowerCase();
    return this.history.filter(msg => 
      msg.content.toLowerCase().includes(lowerQuery) ||
      (msg.role && msg.role.toLowerCase().includes(lowerQuery))
    );
  }
}
