import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import morgan from 'morgan';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // eslint-disable-next-line
  app.use(morgan('tiny'));
  await app.listen(process.env.PORT ?? 3000);
  // await app.listen(3001, '10.161.24.176');
}
bootstrap();
