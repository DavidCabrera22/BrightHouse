import { ConfigService } from '@nestjs/config';
import { createAiClient, getAiModel, generateAiJson } from './ai-client';

describe('shared AI client', () => {
  it('uses the bot provider and model configuration', () => {
    const config = new ConfigService({ GROQ_API_KEY: 'test-key', GROQ_BASE_URL: 'https://example.test/v1', GROQ_MODEL: 'configured-model' });
    const client = createAiClient(config);
    expect(client.apiKey).toBe('test-key');
    expect(client.baseURL).toBe('https://example.test/v1');
    expect(getAiModel(config)).toBe('configured-model');
    expect(getAiModel(new ConfigService())).toBe('openai/gpt-oss-120b');
  });

  const validate = (value: any): value is { action: string } => typeof value?.action === 'string';
  function mockClient(content: string | null, finish_reason = 'stop') {
    const create = jest.fn().mockResolvedValue({ choices: [{ finish_reason, message: { content } }] });
    return { client: { chat: { completions: { create } } } as any, create };
  }

  it('requests JSON with the configured model and returns validated data', async () => {
    const { client, create } = mockClient('{"action":"Contactar"}');
    await expect(generateAiJson(client, 'bot-model', 'Return JSON', validate)).resolves.toEqual({ action: 'Contactar' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: 'bot-model', response_format: { type: 'json_object' } }));
  });

  it.each([[null, 'stop'], ['{}', 'stop'], ['invalid', 'stop'], ['{"action":"Contactar"}', 'length']])('rejects unusable responses %s %s', async (content, finish) => {
    const { client } = mockClient(content, finish!);
    await expect(generateAiJson(client, 'bot-model', 'Return JSON', validate)).rejects.toThrow();
  });
});
