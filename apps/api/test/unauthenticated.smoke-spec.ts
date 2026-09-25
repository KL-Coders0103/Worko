import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { ReelsController } from '../src/reels/reels.controller';
import { RequirementsController } from '../src/requirements/requirements.controller';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/role.guards';
import { ReelsService } from '../src/reels/reels.service';
import { RequirementsService } from '../src/requirements/requirements.service';

describe('API authentication smoke tests', () => {
  let app: INestApplication;

  const reelsService = {
    getFeed: jest.fn(),
  };

  const requirementsService = {
    listMine: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        ReelsController,
        RequirementsController,
      ],
      providers: [
        {provide: ReelsService, useValue: reelsService},
        {provide: RequirementsService, useValue: requirementsService},
        JwtAuthGuard,
        RolesGuard,
      ],
    }).compile();

    app = module.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated reel feed requests', async () => {
    await request(app.getHttpServer())
      .get('/reels/feed')
      .expect(401);

    expect(reelsService.getFeed).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requirement list requests', async () => {
    await request(app.getHttpServer())
      .get('/requirements/me')
      .expect(401);

    expect(requirementsService.listMine).not.toHaveBeenCalled();
  });
});
