import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

export const userE2E = () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

  describe('/users (GET)', () => {
    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer()).get('/users').expect(401);
      });

      it('should deny access with Access-Token with User-Role', async () => {
        await request(app.getHttpServer())
          .get('/users')
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(403);
      });
    });

    describe('Successfull', () => {
      it('should get a list of users', async () => {
        const response = await request(app.getHttpServer())
          .get('/users')
          .set({
            Authorization: `Bearer ${adminToken}`,
          })
          .expect(200);

        expect(response.body.length).toBe(2);
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ name: 'Admin', role: 'administrator' }),
            expect.objectContaining({ name: 'User', role: 'user' }),
          ]),
        );
      });
    });
  });

  describe('/users/:id (DELETE)', () => {
    let deleteUserId: string;
    let adminUserId: string;

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        name: 'DeleteUser',
        password: 'pw@1234',
        passwordConfirmation: 'pw@1234',
      });

      const response = await request(app.getHttpServer())
        .get('/users')
        .set({
          Authorization: `Bearer ${adminToken}`,
        });

      adminUserId = response.body[0].id;
      deleteUserId = response.body[2].id;
    });

    describe('AuthGuard', () => {
      it('should deny access without Access-Token', async () => {
        await request(app.getHttpServer())
          .delete(`/users/${deleteUserId}`)
          .expect(401);
      });

      it('should deny access with Access-Token with User-Role', async () => {
        await request(app.getHttpServer())
          .delete(`/users/${deleteUserId}`)
          .set({ Authorization: `Bearer ${userToken}` })
          .expect(403);
      });
    });

    describe('Successfull', () => {
      it('should delete one user', async () => {
        await request(app.getHttpServer())
          .delete(`/users/${deleteUserId}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(200);

        const response = await request(app.getHttpServer())
          .get('/users')
          .set({
            Authorization: `Bearer ${adminToken}`,
          });

        expect(response.body.length).toBe(2);
      });
    });

    describe('Failure', () => {
      it('should throw exception if id is not valid', async () => {
        await request(app.getHttpServer())
          .delete('/users/invalid-id')
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(400);
      });

      it('should throw exception no user with id exists', async () => {
        await request(app.getHttpServer())
          .delete('/users/65aadb66ad5902a0cc8e2786')
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(404);
      });

      it('should throw exception if user wants to delete himself', async () => {
        await request(app.getHttpServer())
          .delete(`/users/${adminUserId}`)
          .set({ Authorization: `Bearer ${adminToken}` })
          .expect(409);
      });
    });
  });
};
