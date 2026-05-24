import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    controller = moduleRef.get(AppController);
  });

  it('reports health "ok"', () => {
    expect(controller.health().status).toBe('ok');
  });

  it('responds to ping', () => {
    expect(controller.ping().pong).toBe(true);
  });

  it('exposes API version v1', () => {
    expect(controller.version().apiVersion).toBe('v1');
  });

  it('lists available endpoints in the root payload', () => {
    expect(Array.isArray(controller.root().endpoints)).toBe(true);
  });
});
