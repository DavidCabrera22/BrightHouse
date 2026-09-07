import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

// Shared by the bot and CRM recommendations.
export function createAiClient(config: ConfigService): OpenAI {
  return new OpenAI({
    apiKey: config.get<string>('GROQ_API_KEY'),
    baseURL: config.get<string>('GROQ_BASE_URL') ?? 'https://api.groq.com/openai/v1',
  });
}

export function getAiModel(config: ConfigService): string {
  return config.get<string>('GROQ_MODEL') ?? 'openai/gpt-oss-120b';
}

export async function generateAiJson<T>(client: OpenAI, model: string, prompt: string, validate: (value: any) => value is T): Promise<T> {
  const response = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });
  const choice = response.choices[0];
  if (choice?.finish_reason !== 'stop' || !choice.message.content?.trim()) {
    throw new Error('AI returned an empty or incomplete response');
  }
  const result: unknown = JSON.parse(choice.message.content);
  if (!validate(result)) throw new Error('AI returned an invalid response structure');
  return result;
}
