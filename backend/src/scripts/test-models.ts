import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log('API Key present:', !!apiKey);

  const testModels = [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'meta-llama/llama-3.3-70b-instruct',
    'deepseek/deepseek-chat',
    'openai/gpt-4o-mini'
  ];

  for (const model of testModels) {
    try {
      console.log(`Testing model: ${model}...`);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'LodgiX Hub'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say hello in 3 words' }]
        })
      });
      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        console.log(`SUCCESS with ${model}:`, data.choices[0].message.content.trim());
        break;
      } else {
        console.log(`Failed ${model}:`, data.error?.message || res.status);
      }
    } catch (e: any) {
      console.log(`Error ${model}:`, e.message);
    }
  }
  process.exit(0);
}

testOpenRouter();
