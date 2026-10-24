import { Controller, Get, Injectable, Module, type Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module.js';
import { Public } from '../../src/core/auth/public.decorator.js';
import {
  accountPolicy,
  Can,
  clubPolicy,
  Policies,
  type ScopeLoader,
} from '../../src/core/authorization/policy.js';
import { configureApp } from '../../src/core/configure-app.js';

@Injectable()
class UnprovidedLoader implements ScopeLoader<true> {
  load() {
    return Promise.resolve(true as const);
  }
}

const policies = {
  'test.club.read': clubPolicy({ allows: () => true }),
  'test.account.read': accountPolicy({ allows: () => true }),
  'test.resource.read': clubPolicy({ loader: UnprovidedLoader, allows: () => true }),
};

@Controller('test/undeclared')
class UndeclaredController {
  @Get()
  list() {
    return [];
  }
}

@Policies(policies)
@Controller('test/unknown-action')
class UnknownActionController {
  @Can('test.club.write')
  @Get()
  list() {
    return [];
  }
}

@Policies(policies)
@Controller('test/no-club')
class ClubActionWithoutClubController {
  @Can('test.club.read')
  @Get()
  list() {
    return [];
  }
}

@Policies(policies)
@Controller('clubs/:clubId/test-resources')
class UnprovidedLoaderController {
  @Can('test.resource.read')
  @Get()
  list() {
    return [];
  }
}

@Policies(policies)
@Controller()
class DeclaredController {
  @Public()
  @Get('test/public')
  open() {
    return [];
  }

  @Can('test.account.read')
  @Get('test/account')
  account() {
    return [];
  }

  @Can('test.club.read')
  @Get(['clubs/:clubId/test-a', 'clubs/:clubId/test-b'])
  club() {
    return [];
  }
}

async function boot(controller: Type): Promise<unknown> {
  @Module({ controllers: [controller] })
  class TestModule {}

  const moduleRef = await Test.createTestingModule({ imports: [AppModule, TestModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  try {
    await app.init();
    return undefined;
  } catch (error) {
    return error;
  } finally {
    await app.close();
  }
}

describe('Routes declare their authorization (TECH-05, BR-ROLE-07, NFR-SEC-02)', () => {
  it('boots when every route is public or declares a known action', async () => {
    await expect(boot(DeclaredController)).resolves.toBeUndefined();
  });

  it.each([
    [UndeclaredController, 'UndeclaredController.list declares neither @Can() nor @Public()'],
    [
      UnknownActionController,
      "UnknownActionController.list declares test.club.write, which its controller's @Policies() lacks",
    ],
    [
      ClubActionWithoutClubController,
      'ClubActionWithoutClubController.list declares the club action test.club.read on a path without :clubId',
    ],
    [
      UnprovidedLoaderController,
      'UnprovidedLoaderController.list needs UnprovidedLoader, which no module provides',
    ],
  ])('refuses to boot with %o', async (controller, problem) => {
    const error = await boot(controller);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(problem);
  });
});
