import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

export const authE2E = () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  describe('/auth/register (POST)', () => {
    describe('Payload Constraints', () => {
      it('should reject when name is missing', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            password: 'pw@1234',
            passwordConfirmation: 'pw@1234',
          })
          .expect(400);

        expect(response.body.message).toContain('name should not be empty');
      });

      it('should reject when password is missing', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'Admin',
            passwordConfirmation: 'pw@1234',
          })
          .expect(400);

        expect(response.body.message).toContain('password should not be empty');
      });

      it('should reject when passwordConfirmation is missing', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'Admin',
            password: 'pw@1234',
          })
          .expect(400);

        expect(response.body.message).toContain(
          'passwordConfirmation should not be empty',
        );
      });

      it('should reject name shorter than 4 characters', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'Gra',
            password: 'pw@1234',
            passwordConfirmation: 'pw@1234',
          })
          .expect(400);

        expect(response.body.message).toContain(
          'name must be longer than or equal to 4 characters',
        );
      });

      it('should reject password shorter than 6 characters', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'Admin',
            password: 'pw@12',
            passwordConfirmation: 'pw@12',
          })
          .expect(400);

        expect(response.body.message).toContain(
          'password must be longer than or equal to 6 characters',
        );
      });

      it('should reject password with no numbers', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'Admin',
            password: 'password@',
            passwordConfirmation: 'password@',
          })
          .expect(400);

        expect(response.body.message).toContain(
          'The password must contain at least one number and one special character.',
        );
      });

      it('should reject password with no special characters', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'Admin',
            password: 'password1',
            passwordConfirmation: 'password1',
          })
          .expect(400);

        expect(response.body.message).toContain(
          'The password must contain at least one number and one special character.',
        );
      });
    });

    describe('Successfull', () => {
      it('should register admin user', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'Admin',
            password: 'pw@1234',
            passwordConfirmation: 'pw@1234',
          })
          .expect(201);

        expect(response.body.AccessToken).toMatch(/^ey/);
      });

      it('should register ordinary user', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'User',
            password: 'pw@1234',
            passwordConfirmation: 'pw@1234',
          })
          .expect(201);
      });
    });

    describe('Failure', () => {
      it('should fail because of duplicate name', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'Admin',
            password: 'pw@1234',
            passwordConfirmation: 'pw@1234',
          })
          .expect(409);

        expect(response.body.message).toBe(
          'User with name Admin already exist',
        );
      });
    });
  });

  describe('/auth/login (POST)', () => {
    describe('Payload Constraints', () => {
      it('should reject when name is missing', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            password: 'pw@1234',
          })
          .expect(400);

        expect(response.body.message).toContain('name should not be empty');
      });

      it('should reject when password is missing', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            name: 'Admin',
          })
          .expect(400);

        expect(response.body.message).toContain('password should not be empty');
      });
    });

    describe('Successfull', () => {
      it('should login user', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            name: 'Admin',
            password: 'pw@1234',
          })
          .expect(200);

        expect(response.body.AccessToken).toMatch(/^ey/);
      });
    });

    describe('Failure', () => {
      it('should fail because of wrong name', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            name: 'FalseName',
            password: 'pw@1234',
          })
          .expect(401);

        expect(response.body.message).toBe('Username or Password is not valid');
      });

      it('should fail because of wrong password', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            name: 'Admin',
            password: 'pw@12345',
          })
          .expect(401);

        expect(response.body.message).toBe('Username or Password is not valid');
      });
    });
  });
};
