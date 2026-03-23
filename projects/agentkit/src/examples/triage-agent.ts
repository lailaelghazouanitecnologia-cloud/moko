import { BaseAgent } from '../core/base-agent';
import { IntentClassifier } from '../core/intent-classifier';
import { Context } from '../core/context';
import { Response } from '../core/response';
import { RoutingEvent } from '../core/routing-event';
import { Feedback } from '../core/feedback';
import { Metrics } from '../core/metrics';

export class TriageAgent extends BaseAgent {
  private agentRegistry: Map<string, BaseAgent> = new Map();
  private intentClassifier: IntentClassifier | null = null;
  private confidenceThreshold: number = 0.7;
  private routingHistory: Map<string, RoutingEvent[]> = new Map();

  registerAgent(intent: string, agent: BaseAgent): void {
    this.agentRegistry.set(intent, agent);
  }

  async classifyIntent(message: string): Promise<string> {
    if (!this.intentClassifier) {
      throw new Error('Intent classifier not initialized');
    }
    return await this.intentClassifier.predict(message);
  }

  async routeMessage(message: string, context: Context): Promise<Response> {
    const intent = await this.classifyIntent(message);
    const confidence = await this.getConfidenceScore(message, intent);
    
    if (confidence < this.confidenceThreshold) {
      return await this.handleUnknownIntent(message);
    }

    const agent = this.agentRegistry.get(intent);
    if (!agent) {
      return await this.handleUnknownIntent(message);
    }

    this.logRoutingDecision(message, intent, agent.constructor.name);
    return await agent.process(message, context);
  }

  async getAgentCapabilities(agentName: string): Promise<string[]> {
    const agent = Array.from(this.agentRegistry.values()).find(
      a => a.constructor.name === agentName
    );
    
    if (!agent) {
      return [];
    }

    return agent.getTools().map(tool => tool.name);
  }

  async transferContext(fromAgent: string, toAgent: string, context: Context): Promise<void> {
    const from = Array.from(this.agentRegistry.values()).find(
      a => a.constructor.name === fromAgent
    );
    const to = Array.from(this.agentRegistry.values()).find(
      a => a.constructor.name === toAgent
    );

    if (!from || !to) {
      throw new Error('Agent not found');
    }

    const state = await from.getState();
    await to.setState(state);
  }

  async escalateToHuman(reason: string, context: Context): Promise<void> {
    const escalationEvent: RoutingEvent = {
      timestamp: new Date(),
      message: `Escalated to human: ${reason}`,
      intent: 'human_escalation',
      agent: 'HumanAgent',
      sessionId: context.sessionId
    };

    const history = this.routingHistory.get(context.sessionId) || [];
    history.push(escalationEvent);
    this.routingHistory.set(context.sessionId, history);
  }

  async getConfidenceScore(message: string, intent: string): Promise<number> {
    if (!this.intentClassifier) {
      return 0;
    }
    return await this.intentClassifier.getConfidence(message, intent);
  }

  async suggestAgents(message: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    for (const [intent, agent] of this.agentRegistry) {
      const confidence = await this.getConfidenceScore(message, intent);
      if (confidence > 0.5) {
        suggestions.push(agent.constructor.name);
      }
    }

    return suggestions.sort((a, b) => {
      const confidenceA = this.getConfidenceScore(message, a.toLowerCase());
      const confidenceB = this.getConfidenceScore(message, b.toLowerCase());
      return confidenceB - confidenceA;
    });
  }

  logRoutingDecision(message: string, intent: string, agent: string): void {
    const sessionId = 'default'; // Should be extracted from context in real usage
    const event: RoutingEvent = {
      timestamp: new Date(),
      message,
      intent,
      agent,
      sessionId
    };

    const history = this.routingHistory.get(sessionId) || [];
    history.push(event);
    this.routingHistory.set(sessionId, history);
  }

  async getRoutingHistory(sessionId: string): Promise<RoutingEvent[]> {
    return this.routingHistory.get(sessionId) || [];
  }

  async updateClassifier(feedback: Feedback): Promise<void> {
    if (!this.intentClassifier) {
      throw new Error('Intent classifier not initialized');
    }
    await this.intentClassifier.retrain(feedback);
  }

  async handleUnknownIntent(message: string): Promise<Response> {
    const fallbackAgent = this.getFallbackAgent();
    return await fallbackAgent.process(message, { sessionId: 'default' });
  }

  getFallbackAgent(): BaseAgent {
    const fallback = this.agentRegistry.get('fallback');
    if (!fallback) {
      throw new Error('No fallback agent configured');
    }
    return fallback;
  }

  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = threshold;
  }

  async getPerformanceMetrics(): Promise<Metrics> {
    if (!this.intentClassifier) {
      return {
        accuracy: 0,
        totalPredictions: 0,
        correctPredictions: 0
      };
    }

    return await this.intentClassifier.getMetrics();
  }
}
