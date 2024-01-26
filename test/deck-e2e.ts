import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Language } from '../src/deck/languages.enum';

export const deckE2E = () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  beforeAll(async () => {
    const adminResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: 'Admin', password: 'pw@1234' })
      .expect(200);

    const userResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: 'User', password: 'pw@1234' })
      .expect(200);

    adminToken = adminResponse.body.AccessToken;
    userToken = userResponse.body.AccessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/decks (POST)', () => {
    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer()).post('/decks').expect(401);
      });
    });

    describe('Paylaod Constraints', () => {
      it('should reject when name is missing', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            learningRate: 10,
            fromLang: Language.de,
            toLang: Language.en,
          })
          .expect(400);

        expect(response.body.message).toContain('name should not be empty');
      });

      it('should reject when learningRate is missing', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'TestDeck',
            fromLang: Language.de,
            toLang: Language.en,
          })
          .expect(400);

        expect(response.body.message).toContain(
          'learningRate should not be empty',
        );
      });

      it('should reject when fromLang is missing', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'TestDeck',
            learningRate: 10,
            toLang: Language.en,
          })
          .expect(400);

        expect(response.body.message).toContain('fromLang should not be empty');
      });

      it('should reject when toLang is missing', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'TestDeck',
            learningRate: 10,
            fromLang: Language.de,
          })
          .expect(400);

        expect(response.body.message).toContain('toLang should not be empty');
      });

      it('should reject when name has less than 4 characters', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'ABC',
            learningRate: 10,
            fromLang: Language.de,
            toLang: Language.en,
          })
          .expect(400);

        expect(response.body.message).toContain(
          'name must be longer than or equal to 4 characters',
        );
      });

      it('should reject when learningRate is less than 1', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'TestDeck',
            learningRate: 0,
            fromLang: Language.de,
            toLang: Language.en,
          })
          .expect(400);

        expect(response.body.message).toContain(
          'learningRate must not be less than 1',
        );
      });

      it('should reject when fromLang and toLang are the same', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'TestDeck',
            learningRate: 10,
            fromLang: Language.en,
            toLang: Language.en,
          })
          .expect(400);

        expect(response.body.message).toContain(
          'toLang and fromLang must not match',
        );
      });

      it('should reject when no Lang contains en', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'TestDeck',
            learningRate: 10,
            fromLang: Language.de,
            toLang: Language.es,
          })
          .expect(400);

        expect(response.body.message).toContain(
          'Either toLang or fromLang must be en',
        );
      });
    });

    describe('Successfull', () => {
      it('should create a deck and return a id', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'TestDeck',
            learningRate: 10,
            fromLang: Language.de,
            toLang: Language.en,
          })
          .expect(201);

        expect(response.body).toEqual(
          expect.objectContaining({ id: expect.any(String) }),
        );
      });
    });

    describe('Failure', () => {
      it('should throw exception if deck with name already exists', async () => {
        await request(app.getHttpServer())
          .post('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'TestDeck',
            learningRate: 10,
            fromLang: Language.de,
            toLang: Language.en,
          })
          .expect(409);
      });
    });
  });

  describe('/decks (GET)', () => {
    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer()).get('/decks').expect(401);
      });
    });

    describe('Successfull', () => {
      it('should get a list of decks', async () => {
        const response = await request(app.getHttpServer())
          .get('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(200);

        expect(response.body.length).toBe(1);
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: 'TestDeck',
              learningRate: 10,
              fromLang: 'de',
              toLang: 'en',
              newCardCount: 0,
              oldCardCount: 0,
            }),
          ]),
        );
      });
    });
  });

  describe('/decks/import (POST)', () => {
    let deckId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .get('/decks')
        .set({ Authorization: `Bearer ${userToken}` });

      deckId = response.body[0].id;
    });

    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer()).get('/decks').expect(401);
      });
    });

    describe('Paylaod Constraints', () => {
      it('should reject when deckId is missing', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks/import')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({})
          .expect(400);

        expect(response.body.message).toContain('deckId should not be empty');
      });

      it('should reject when deckId is empty', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks/import')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            deckId: '',
          })
          .expect(400);

        expect(response.body.message).toContain('deckId should not be empty');
      });
    });

    describe('Successfull', () => {
      it('should import the deck', async () => {
        const decksBeforeResponse = await request(app.getHttpServer())
          .get('/decks')
          .set({ Authorization: `Bearer ${adminToken}` });
        expect(decksBeforeResponse.body.length).toBe(0);

        await request(app.getHttpServer())
          .post('/decks/import')
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ deckId })
          .expect(201);

        const decksAfterResponse = await request(app.getHttpServer())
          .get('/decks')
          .set({ Authorization: `Bearer ${adminToken}` });
        expect(await decksAfterResponse.body.length).toBe(1);
      });
    });

    describe('Failure', () => {
      it('should throw exception if deckId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks/import')
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ deckId: 'invalid-id' })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });

      it('should throw exception if user already has a deck with this name', async () => {
        const response = await request(app.getHttpServer())
          .post('/decks/import')
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ deckId })
          .expect(409);

        expect(response.body.message).toBe('Deck already exists: TestDeck');
      });
    });
  });

  describe('/decks/:deckId (GET)', () => {
    let adminDeckId: string;
    let userDeckId: string;

    beforeAll(async () => {
      const adminResponse = await request(app.getHttpServer())
        .get('/decks')
        .set({ Authorization: `Bearer ${adminToken}` });

      const userResponse = await request(app.getHttpServer())
        .get('/decks')
        .set({ Authorization: `Bearer ${userToken}` });

      adminDeckId = adminResponse.body[0].id;
      userDeckId = userResponse.body[0].id;
    });

    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer()).get('/decks/id').expect(401);
      });
    });

    describe('OwnDeckOrAdminGuard', () => {
      it('should not be allowed for user to access deck from other user', async () => {
        await request(app.getHttpServer())
          .get(`/decks/${adminDeckId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(403);
      });

      it('should be allowed for admin to access deck from other user', async () => {
        await request(app.getHttpServer())
          .get(`/decks/${userDeckId}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);
      });
    });

    describe('Successfull', () => {
      it('should get one deck by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/decks/${userDeckId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(200);

        expect(response.body).toEqual({
          id: userDeckId,
          name: 'TestDeck',
          learningRate: 10,
          fromLang: 'de',
          toLang: 'en',
        });
      });
    });

    describe('Failure', () => {
      it('should throw exception if deckId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .get('/decks/invalid-id')
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });

      it('should throw exception if deck with id not found', async () => {
        await request(app.getHttpServer())
          .get('/decks/65aaf6ea6afb9f2600a9f8f4')
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(404);
      });
    });
  });

  describe('/decks/:deckId/stats (GET)', () => {
    let adminDeckId: string;
    let userDeckId: string;

    beforeAll(async () => {
      const adminResponse = await request(app.getHttpServer())
        .get('/decks')
        .set({ Authorization: `Bearer ${adminToken}` });

      const userResponse = await request(app.getHttpServer())
        .get('/decks')
        .set({ Authorization: `Bearer ${userToken}` });

      adminDeckId = adminResponse.body[0].id;
      userDeckId = userResponse.body[0].id;
    });

    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer()).get('/decks/id/stats').expect(401);
      });
    });

    describe('OwnDeckOrAdminGuard', () => {
      it('should not be allowed for user to access stats from other user', async () => {
        await request(app.getHttpServer())
          .get(`/decks/${adminDeckId}/stats`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(403);
      });

      it('should be allowed for admin to access stats from other user', async () => {
        await request(app.getHttpServer())
          .get(`/decks/${userDeckId}/stats`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);
      });
    });

    describe('Successfull', () => {
      it('should get the empty stats-list for the deck', async () => {
        const response = await request(app.getHttpServer())
          .get(`/decks/${userDeckId}/stats`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(200);

        expect(response.body).toEqual([]);
      });
    });

    describe('Failure', () => {
      it('should throw exception if deckId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .get('/decks/invalid-id/stats')
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });

      it('should throw exception if deck with id not found', async () => {
        await request(app.getHttpServer())
          .get('/decks/65aaf6ea6afb9f2600a9f8f4/stats')
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(404);
      });
    });
  });

  describe('/decks/:deckId (PUT)', () => {
    let adminDeckId: string;
    let userDeckId: string;

    beforeAll(async () => {
      const adminResponse = await request(app.getHttpServer())
        .get('/decks')
        .set({ Authorization: `Bearer ${adminToken}` });

      const userResponse = await request(app.getHttpServer())
        .get('/decks')
        .set({ Authorization: `Bearer ${userToken}` });

      adminDeckId = adminResponse.body[0].id;
      userDeckId = userResponse.body[0].id;
    });

    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer()).put('/decks/id').expect(401);
      });
    });

    describe('OwnDeckOrAdminGuard', () => {
      it('should not be allowed for user to update deck from other user', async () => {
        await request(app.getHttpServer())
          .put(`/decks/${adminDeckId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(403);
      });

      it('should be allowed for admin to update deck from other user', async () => {
        await request(app.getHttpServer())
          .put(`/decks/${userDeckId}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ name: 'TestDeck', learningRate: 10 })
          .expect(200);
      });
    });

    describe('Payload Constraints', () => {
      it('should reject if name is missing', async () => {
        const response = await request(app.getHttpServer())
          .put(`/decks/${userDeckId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            learningRate: 10,
          })
          .expect(400);

        expect(response.body.message).toContain('name should not be empty');
      });

      it('should reject if name less than 4 characters long', async () => {
        const response = await request(app.getHttpServer())
          .put(`/decks/${userDeckId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'ABC',
            learningRate: 10,
          })
          .expect(400);

        expect(response.body.message).toContain(
          'name must be longer than or equal to 4 characters',
        );
      });

      it('should reject if learningRate is missing', async () => {
        const response = await request(app.getHttpServer())
          .put(`/decks/${userDeckId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'TestDeck',
          })
          .expect(400);

        expect(response.body.message).toContain(
          'learningRate should not be empty',
        );
      });

      it('should reject if learningRate is less than 1', async () => {
        const response = await request(app.getHttpServer())
          .put(`/decks/${userDeckId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'TestDeck',
            learningRate: 0,
          })
          .expect(400);

        expect(response.body.message).toContain(
          'learningRate must not be less than 1',
        );
      });
    });

    describe('Successfull', () => {
      it('should update and return the deck', async () => {
        const response = await request(app.getHttpServer())
          .put(`/decks/${userDeckId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'UpdatedDeck',
            learningRate: 5,
          })
          .expect(200);

        expect(response.body).toEqual({
          id: expect.any(String),
          name: 'UpdatedDeck',
          learningRate: 5,
          fromLang: 'de',
          toLang: 'en',
        });
      });
    });

    describe('Failure', () => {
      beforeAll(async () => {
        await request(app.getHttpServer())
          .post('/decks')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'DuplicateDeck',
            learningRate: 10,
            fromLang: Language.de,
            toLang: Language.en,
          });
      });

      it('should throw exception if deckId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .put('/decks/invalid-id')
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'TestDeck',
            learningRate: 10,
          })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });

      it('should throw exception if user already has a deck with this name', async () => {
        const response = await request(app.getHttpServer())
          .put(`/decks/${userDeckId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .send({
            name: 'DuplicateDeck',
            learningRate: 10,
          })
          .expect(409);

        expect(response.body.message).toBe(
          'Deck already exists: DuplicateDeck',
        );
      });
    });
  });

  describe('/decks/:deckId/swap (PATCH)', () => {
    let adminDeckId: string;
    let userDeckId: string;

    beforeAll(async () => {
      const adminResponse = await request(app.getHttpServer())
        .get('/decks')
        .set({ Authorization: `Bearer ${adminToken}` });

      const userResponse = await request(app.getHttpServer())
        .get('/decks')
        .set({ Authorization: `Bearer ${userToken}` });

      adminDeckId = adminResponse.body[0].id;
      userDeckId = userResponse.body[0].id;
    });

    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer()).patch('/decks/id/swap').expect(401);
      });
    });

    describe('OwnDeckOrAdminGuard', () => {
      it('should not be allowed for user to swap deck from other user', async () => {
        await request(app.getHttpServer())
          .patch(`/decks/${adminDeckId}/swap`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(403);
      });

      it('should be allowed for admin to swap deck from other user', async () => {
        await request(app.getHttpServer())
          .patch(`/decks/${userDeckId}/swap`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);
      });
    });

    describe('Successfull', () => {
      it('should swap the deck', async () => {
        await request(app.getHttpServer())
          .patch(`/decks/${adminDeckId}/swap`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);

        const decksResponse = await request(app.getHttpServer())
          .get('/decks')
          .set({ Authorization: `Bearer ${adminToken}` });

        expect(decksResponse.body[2]).toEqual({
          id: expect.any(String),
          name: 'TestDeck-Reversed',
          learningRate: 10,
          fromLang: 'en',
          toLang: 'de',
          newCardCount: 0,
          oldCardCount: 0,
        });
      });
    });

    describe('Failure', () => {
      it('should throw exception if deckId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .patch('/decks/invalid-id/swap')
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });

      it('should throw exception if user already has a deck with this name', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/decks/${adminDeckId}/swap`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(409);

        expect(response.body.message).toBe(
          'Deck already exists: TestDeck-Reversed',
        );
      });
    });
  });

  describe('/deck/:deckId (DELETE)', () => {
    let adminDeckId: string;
    let userDeckId: string;

    beforeAll(async () => {
      const adminResponse = await request(app.getHttpServer())
        .get('/decks')
        .set({ Authorization: `Bearer ${adminToken}` });

      const userResponse = await request(app.getHttpServer())
        .get('/decks')
        .set({ Authorization: `Bearer ${userToken}` });

      adminDeckId = adminResponse.body[0].id;
      userDeckId = userResponse.body[0].id;
    });

    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer()).delete('/decks/id').expect(401);
      });
    });

    describe('OwnDeckOrAdminGuard', () => {
      it('should not be allowed for user to delete deck from other user', async () => {
        await request(app.getHttpServer())
          .delete(`/decks/${adminDeckId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(403);
      });

      it('should be allowed for admin to delete deck from other user', async () => {
        await request(app.getHttpServer())
          .delete(`/decks/${userDeckId}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);
      });
    });

    describe('Successfull', () => {
      it('should delete a deck', async () => {
        const decksBeforeResponse = await request(app.getHttpServer())
          .get('/decks')
          .set({ Authorization: `Bearer ${adminToken}` });
        expect(decksBeforeResponse.body.length).toBe(3);

        await request(app.getHttpServer())
          .delete(`/decks/${adminDeckId}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);

        const decksAfterResponse = await request(app.getHttpServer())
          .get('/decks')
          .set({ Authorization: `Bearer ${adminToken}` });
        expect(decksAfterResponse.body.length).toBe(2);
      });
    });

    describe('Failure', () => {
      it('should throw exception if deckId is not valid', async () => {
        const response = await request(app.getHttpServer())
          .delete('/decks/invalid-id')
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });
    });
  });
};
