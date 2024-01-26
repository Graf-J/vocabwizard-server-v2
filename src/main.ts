import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import 'dotenv/config';
import { CardDto } from './card/dto/card.dto';
import { DeckDto } from './deck/dto/deck.dto';
import { DecksDto } from './deck/dto/decks.dto';
import { UserDto } from './user/dto/user.dto';
import { AuthResponseDto } from './auth/dto/auth-response.dto';
import { ImportDeckDto } from './deck/dto/import-deck.dto';
import { StatDto } from './deck/dto/stat.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Add Validation Pipe
  app.useGlobalPipes(new ValidationPipe());

  // Add Swagger
  const config = new DocumentBuilder()
    .setTitle('Vocab-Wizard-Server')
    .setDescription('This is the Swagger API of the Vocab-Wizard-Server')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      CardDto,
      DeckDto,
      DecksDto,
      UserDto,
      AuthResponseDto,
      ImportDeckDto,
      StatDto,
    ],
  });
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
