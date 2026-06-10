import { v4 as uuidv4 } from 'uuid';

export function generateUser() {
  const id = uuidv4().split('-')[0];
  return {
    email: `test_user_${id}@example.com`,
    username: `user_${id}`,
    fullName: `Test User ${id}`,
    password: 'Password123!',
  };
}

export function uniqueSuffix() {
  return `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export async function createLocalTelegramBotToken(request) {
  const res = await request.post('http://localhost:9992/api/generate_bot', {
    data: {},
  });
  if (!res.ok()) {
    throw new Error(`tgb generate_bot failed: ${res.status()} ${res.statusText()}`);
  }
  const body = await res.json();
  if (!body?.ok || !body?.result?.token || !body?.result?.username) {
    throw new Error(`tgb generate_bot returned invalid response: ${JSON.stringify(body)}`);
  }
  return { token: body.result.token, username: body.result.username };
}
