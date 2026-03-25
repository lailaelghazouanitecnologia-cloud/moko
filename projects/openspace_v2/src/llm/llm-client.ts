import { BaseTool } from './base-tool';

type Message = {
  role: string;
  content: string;
};

type CompletionResult = {
  choices: Array<{
    message: Message;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export class LLMClient {
  private readonly model: string;
  private readonly enableThinking: boolean;
  private readonly rateLimitDelay: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly timeout: number;
  private readonly summarizeThresholdChars: number;
  private readonly enableToolResultSummarization: boolean;
  private readonly litellmKwargs: Record<string, unknown>;

  constructor(
    model: string = 'openrouter/anthropic/claude-sonnet-4.5',
    enableThinking: boolean = false,
    rateLimitDelay: number = 0.0,
    maxRetries: number = 3,
    retryDelay: number = 1.0,
    timeout: number = 120.0,
    summarizeThresholdChars: number = 8000,
    enableToolResultSummarization: boolean = true,
    ...litellmKwargs: Record<string, unknown>[]
  ) {
    this.model = model;
    this.enableThinking = enableThinking;
    this.rateLimitDelay = rateLimitDelay;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.timeout = timeout;
    this.summarizeThresholdChars = summarizeThresholdChars;
    this.enableToolResultSummarization = enableToolResultSummarization;
    this.litellmKwargs = Object.assign({}, ...litellmKwargs);
  }

  async complete(
    messages: Message[] | string,
    tools?: BaseTool[] | null,
    executeTools: boolean = true,
    summaryPrompt?: string | null,
    toolResultCallback?: ((result: unknown) => void) | null,
    ...kwargs: Record<string, unknown>[]
  ): Promise<CompletionResult> {
    const formattedMessages = typeof messages === 'string' ? this.formatMessagesToText([{ role: 'user', content: messages }]) : messages;
    
    const requestBody = {
      model: this.model,
      messages: formattedMessages,
      tools: tools?.map(tool => tool.toJSON()),
      ...this.litellmKwargs,
      ...Object.assign({}, ...kwargs)
    };

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.maxRetries) {
      try {
        if (this.rateLimitDelay > 0 && attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout * 1000);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY ?? ''}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json() as CompletionResult;

        if (executeTools && tools && result.choices[0]?.message?.content) {
          const toolCalls = this.extractToolCalls(result.choices[0].message.content);
          for (const call of toolCalls) {
            const tool = tools.find(t => t.name === call.name);
            if (tool) {
              const toolResult = await tool.execute(call.arguments);
              if (toolResultCallback) {
                toolResultCallback(toolResult);
              }
            }
          }
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;
        
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * 1000));
        }
      }
    }

    throw lastError ?? new Error('Max retries exceeded');
  }

  formatMessagesToText(messages: Message[]): string {
    return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }

  private extractToolCalls(content: string): Array<{ name: string; arguments: Record<string, unknown> }> {
    const toolCallRegex = /<tool_call>(.*?)<\/tool_call>/gs;
    const matches = content.match(toolCallRegex) ?? [];
    
    return matches.map(match => {
      try {
        const jsonStr = match.replace(/<\/?tool_call>/g, '');
        return JSON.parse(jsonStr) as { name: string; arguments: Record<string, unknown> };
      } catch {
        return { name: '', arguments: {} };
      }
    }).filter(call => call.name !== '');
  }
}
