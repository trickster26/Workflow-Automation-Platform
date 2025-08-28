import { config } from 'dotenv';

config({ path: '.env.test' });

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'test_workflow_db';
  process.env.JWT_SECRET = 'test_jwt_secret_key_for_ci';
});

afterAll(async () => {
  if (global.gc) {
    global.gc();
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});