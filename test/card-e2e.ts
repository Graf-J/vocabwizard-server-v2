import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Language } from '../src/deck/languages.enum';
import { TranslatorService } from '../src/card/translator.service';
import { LexicalInfoService } from '../src/card/lexical-info.service';
import { createMock } from '@golevelup/ts-jest';
import ApiDictionaryResponse from '../src/card/response/api-dictionary-response';

const exampleLexicalInfoApiResponse: ApiDictionaryResponse[] = [
  {
    word: 'example',
    phonetic: '/ɪɡˈzæmpəl/',
    phonetics: [
      {
        audio: 'https://example-audio.mp3',
        text: '/ɪɡˈzæmpəl/',
        sourceUrl: 'https://example-source-url.com',
        license: {
          name: 'Example License',
          url: 'https://example-license-url.com',
        },
      },
    ],
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: 'a representative form or pattern',
            synonyms: ['sample', 'model', 'prototype'],
            antonyms: ['aberration', 'anomaly'],
            example: 'This is an example of a definition.',
          },
        ],
        synonyms: ['sample', 'model', 'prototype'],
        antonyms: ['aberration', 'anomaly'],
      },
      {
        partOfSpeech: 'verb',
        definitions: [
          {
            definition: 'to serve as a model for',
            synonyms: ['illustrate', 'demonstrate', 'embody'],
            antonyms: ['ignore', 'neglect'],
            example: 'This sentence is an example of usage.',
          },
        ],
        synonyms: ['illustrate', 'demonstrate', 'embody'],
        antonyms: ['ignore', 'neglect'],
      },
    ],
    license: {
      name: 'Example License',
      url: 'https://example-license-url.com',
    },
    sourceUrls: ['https://example-source-url.com'],
  },
];

export const cardE2E = () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let adminDeckId: string;
  let userDeckId: string;

  beforeAll(async () => {
    const translatorServiceMock = createMock<TranslatorService>();
    translatorServiceMock.translate.mockResolvedValue({
      error: false,
      data: { translatedText: 'example' },
    });

    const lexicalInfoServiceMock = createMock<LexicalInfoService>();
    lexicalInfoServiceMock.getInfo.mockResolvedValue({
      error: false,
      data: exampleLexicalInfoApiResponse,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TranslatorService)
      .useValue(translatorServiceMock)
      .overrideProvider(LexicalInfoService)
      .useValue(lexicalInfoServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  // Authentication
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

  // Create Decks for Card Tests
  beforeAll(async () => {
    const adminResponse = await request(app.getHttpServer())
      .post('/decks')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({
        name: 'CardService-Deck',
        learningRate: 10,
        fromLang: Language.de,
        toLang: Language.en,
      });

    const userResponse = await request(app.getHttpServer())
      .post('/decks')
      .set({ Authorization: `Bearer ${userToken}` })
      .send({
        name: 'CardService-Deck',
        learningRate: 10,
        fromLang: Language.de,
        toLang: Language.en,
      });

    adminDeckId = adminResponse.body.id;
    userDeckId = userResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/decks/:deckId/cards (POST)', () => {
    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer()).post('/decks/id/cards').expect(401);
      });
    });

    describe('OwnDeckOrAdminGuard', () => {
      it('should not be allowed for user to create card for other user', async () => {
        await request(app.getHttpServer())
          .post(`/decks/${adminDeckId}/cards`)
          .set({ Authorization: `Bearer ${userToken}` })
          .send({ word: 'Beispiel' })
          .expect(403);
      });

      it('should be allowed for admin to create card for other user', async () => {
        await request(app.getHttpServer())
          .post(`/decks/${userDeckId}/cards`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ word: 'Beispiel' })
          .expect(201);
      });
    });

    describe('Payload Constraints', () => {
      it('should reject when word is missing', async () => {
        const response = await request(app.getHttpServer())
          .post(`/decks/${adminDeckId}/cards`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({})
          .expect(400);

        expect(response.body.message).toContain('word should not be empty');
      });

      it('should reject when word is empty', async () => {
        const response = await request(app.getHttpServer())
          .post(`/decks/${adminDeckId}/cards`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ word: '' })
          .expect(400);

        expect(response.body.message).toContain('word should not be empty');
      });
    });

    describe('Successfull', () => {
      it('should create a card and return the id', async () => {
        const response = await request(app.getHttpServer())
          .post(`/decks/${adminDeckId}/cards`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ word: 'Exampel' })
          .expect(201);

        expect(response.body).toEqual({
          id: expect.any(String),
        });
      });
    });

    describe('Failure', () => {
      it('should throw exception if deckId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .post(`/decks/invalid-id/cards`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });

      it('should throw exception if user hast this word in his deck', async () => {
        const response = await request(app.getHttpServer())
          .post(`/decks/${userDeckId}/cards`)
          .set({ Authorization: `Bearer ${userToken}` })
          .send({ word: 'Beispiel' })
          .expect(409);

        expect(response.body.message).toBe(
          'The word Beispiel already exists in this deck',
        );
      });
    });
  });

  describe('/decks/:deckId/cards (GET)', () => {
    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer()).get('/decks/id/cards').expect(401);
      });
    });

    describe('OwnDeckOrAdminGuard', () => {
      it('should not be allowed for user to access cards from other user', async () => {
        await request(app.getHttpServer())
          .get(`/decks/${adminDeckId}/cards`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(403);
      });

      it('should be allowed for admin to access cards from other user', async () => {
        await request(app.getHttpServer())
          .get(`/decks/${userDeckId}/cards`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);
      });
    });

    describe('Successfull', () => {
      it('should return a list of cards', async () => {
        const response = await request(app.getHttpServer())
          .get(`/decks/${userDeckId}/cards`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);

        expect(response.body).toEqual([
          {
            id: expect.any(String),
            word: 'Beispiel',
            translation: 'example',
            phonetic: '/ɪɡˈzæmpəl/',
            audioLink: 'https://example-audio.mp3',
            definitions: [
              'a representative form or pattern',
              'to serve as a model for',
            ],
            examples: [
              'This is an example of a definition.',
              'This sentence is an example of usage.',
            ],
            synonyms: [
              'sample',
              'model',
              'prototype',
              'illustrate',
              'demonstrate',
              'embody',
            ],
            antonyms: ['aberration', 'anomaly', 'ignore', 'neglect'],
          },
        ]);
      });
    });

    describe('Failure', () => {
      it('should throw exception if deckId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .get(`/decks/invalid-id/cards`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });
    });
  });

  describe('/decks/:deckId/cards/learn (GET)', () => {
    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer())
          .get('/decks/id/cards/learn')
          .expect(401);
      });
    });

    describe('OwnDeckOrAdminGuard', () => {
      it('should not be allowed for user to access cards to learn from other user', async () => {
        await request(app.getHttpServer())
          .get(`/decks/${adminDeckId}/cards/learn`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(403);
      });

      it('should be allowed for admin to access cards to learn from other user', async () => {
        await request(app.getHttpServer())
          .get(`/decks/${userDeckId}/cards/learn`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);
      });
    });

    describe('Successfull', () => {
      it('should return a list of cards to learn', async () => {
        const response = await request(app.getHttpServer())
          .get(`/decks/${userDeckId}/cards/learn`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);

        expect(response.body).toEqual([
          {
            id: expect.any(String),
            word: 'Beispiel',
            translation: 'example',
            phonetic: '/ɪɡˈzæmpəl/',
            audioLink: 'https://example-audio.mp3',
            definitions: [
              'a representative form or pattern',
              'to serve as a model for',
            ],
            examples: [
              'This is an example of a definition.',
              'This sentence is an example of usage.',
            ],
            synonyms: [
              'sample',
              'model',
              'prototype',
              'illustrate',
              'demonstrate',
              'embody',
            ],
            antonyms: ['aberration', 'anomaly', 'ignore', 'neglect'],
          },
        ]);
      });
    });

    describe('Failure', () => {
      it('should throw exception if deckId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .get(`/decks/invalid-id/cards/learn`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });
    });
  });

  describe('/decks/:deckId/cards/:cardId (DELETE)', () => {
    let adminCardId: string;
    let userCardId: string;

    beforeAll(async () => {
      const adminResponse = await request(app.getHttpServer())
        .get(`/decks/${adminDeckId}/cards`)
        .set({ Authorization: `Bearer ${adminToken}` });

      const userResponse = await request(app.getHttpServer())
        .get(`/decks/${userDeckId}/cards`)
        .set({ Authorization: `Bearer ${userToken}` });

      adminCardId = adminResponse.body[0].id;
      userCardId = userResponse.body[0].id;
    });

    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer())
          .delete('/decks/id/cards/id')
          .expect(401);
      });
    });

    describe('OwnDeckOrAdminGuard', () => {
      it('should not be allowed for user to delete card from other user', async () => {
        await request(app.getHttpServer())
          .delete(`/decks/${adminDeckId}/cards/${adminCardId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(403);
      });

      it('should be allowed for admin to delete card from other user', async () => {
        await request(app.getHttpServer())
          .delete(`/decks/${userDeckId}/cards/${userCardId}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);
      });
    });

    describe('Failure', () => {
      it('should throw exception if deckId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/decks/invalid-id/cards/${adminCardId}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });

      it('should throw exception if cardId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/decks/${adminDeckId}/cards/invalid-id`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });

      it('should throw exception if does not belong to deck', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/decks/${userDeckId}/cards/${adminCardId}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(409);

        expect(response.body.message).toBe('Card does not belong to Deck');
      });

      it('should throw exception if card not found', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/decks/${userDeckId}/cards/${userCardId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(404);

        expect(response.body.message).toBe('Card not found');
      });
    });

    describe('Successfull', () => {
      it('should delete the card', async () => {
        await request(app.getHttpServer())
          .delete(`/decks/${adminDeckId}/cards/${adminCardId}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);
      });
    });
  });

  describe('/decks/:deckId/cards/:cardId (PATCH)', () => {
    let adminCardId: string;
    let userCardId: string;

    // Create some Cards
    beforeAll(async () => {
      const adminResponse = await request(app.getHttpServer())
        .post(`/decks/${adminDeckId}/cards`)
        .set({ Authorization: `Bearer ${adminToken}` })
        .send({ word: 'Beispiel' });

      const userResponse = await request(app.getHttpServer())
        .post(`/decks/${userDeckId}/cards`)
        .set({ Authorization: `Bearer ${adminToken}` })
        .send({ word: 'Beispiel' });

      adminCardId = adminResponse.body.id;
      userCardId = userResponse.body.id;
    });

    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer())
          .patch('/decks/id/cards/id/confidence')
          .expect(401);
      });
    });

    describe('OwnDeckOrAdminGuard', () => {
      it('should not be allowed for user to update card-confidence from other user', async () => {
        await request(app.getHttpServer())
          .patch(`/decks/${adminDeckId}/cards/${adminCardId}/confidence`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(403);
      });

      it('should be allowed for admin to update card-confidence from other user', async () => {
        await request(app.getHttpServer())
          .patch(`/decks/${userDeckId}/cards/${userCardId}/confidence`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ confidence: 'hard' })
          .expect(200);
      });
    });

    describe('Payload Constraints', () => {
      it('should reject when confidence is missing', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/decks/${adminDeckId}/cards/${adminCardId}/confidence`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({})
          .expect(400);

        expect(response.body.message).toContain(
          'confidence should not be empty',
        );
      });

      it('should reject when confidence is not one of the allowed values (hard, good, easy)', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/decks/${adminDeckId}/cards/${adminCardId}/confidence`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ confidence: 'not-correct' })
          .expect(400);

        expect(response.body.message).toContain(
          'confidence must be one of the following values: hard, good, easy',
        );
      });
    });

    describe('Successfull', () => {
      it('should update card confidence', async () => {
        await request(app.getHttpServer())
          .patch(`/decks/${adminDeckId}/cards/${adminCardId}/confidence`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ confidence: 'easy' })
          .expect(200);
      });
    });

    describe('Failure', () => {
      it('should throw exception if deckId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/decks/invalid-id/cards/${adminCardId}/confidence`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ confidence: 'good' })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });

      it('should throw exception if cardId is invalid', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/decks/${adminDeckId}/cards/invalid-id/confidence`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ confidence: 'good' })
          .expect(400);

        expect(response.body.message).toBe('Invalid ObjectId: invalid-id');
      });

      it('should throw exception if does not belong to deck', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/decks/${userDeckId}/cards/${adminCardId}/confidence`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .send({ confidence: 'good' })
          .expect(409);

        expect(response.body.message).toBe('Card does not belong to Deck');
      });
    });
  });
};
