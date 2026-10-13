import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('/api/v1 (GET) should return greeting', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });

  it('/ (GET) without prefix should return 404 standardized error envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/')
      .expect(404);

    expect(response.body).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /',
      details: null,
    });
    expect(response.body.request_id).toBeDefined();
  });

  it('/api/v1/non-existent (GET) should return 404 standardized error envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/non-existent')
      .expect(404);

    expect(response.body).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/v1/non-existent',
      details: null,
    });
    expect(response.body.request_id).toBeDefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
