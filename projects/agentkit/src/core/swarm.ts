import { Agent } from './agent';
import { Conversation } from './conversation';
import { Message } from './message';

export interface SwarmStats {
  agentCount: number;
  conversationCount: number;
  maxAgents: number;
  defaultAgentId: string;
}

export class Swarm {
  private agents: Map<string, Agent> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private defaultAgent: string = '';
  private maxAgents: number = 100;

  addAgent(agent: Agent): string {
    if (this.agents.size >= this.maxAgents) {
      throw new Error('Maximum number of agents reached');
    }
    const id = agent.id || `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.agents.set(id, agent);
    return id;
  }

  removeAgent(id: string): boolean {
    return this.agents.delete(id);
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  createConversation(agentIds?: string[]): string {
    const conversation = new Conversation();
    const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (agentIds && agentIds.length > 0) {
      for (const agentId of agentIds) {
        if (this.agents.has(agentId)) {
          conversation.addAgent(agentId);
        }
      }
    } else if (this.defaultAgent && this.agents.has(this.defaultAgent)) {
      conversation.addAgent(this.defaultAgent);
    }
    
    this.conversations.set(id, conversation);
    return id;
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  deleteConversation(id: string): boolean {
    return this.conversations.delete(id);
  }

  broadcast(message: Message, conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    conversation.addMessage(message);
    
    const agentIds = conversation.getAgentIds();
    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.receiveMessage(message, conversationId);
      }
    }
  }

  setDefaultAgent(id: string): void {
    if (!this.agents.has(id)) {
      throw new Error('Agent not found');
    }
    this.defaultAgent = id;
  }

  getDefaultAgent(): Agent | undefined {
    if (!this.defaultAgent) {
      return undefined;
    }
    return this.agents.get(this.defaultAgent);
  }

  clearAll(): void {
    this.agents.clear();
    this.conversations.clear();
    this.defaultAgent = '';
  }

  getStats(): SwarmStats {
    return {
      agentCount: this.agents.size,
      conversationCount: this.conversations.size,
      maxAgents: this.maxAgents,
      defaultAgentId: this.defaultAgent
    };
  }
}
