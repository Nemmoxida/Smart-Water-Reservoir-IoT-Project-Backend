import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { sensor_data } from 'src/arduino/arduino.entity';

@Module({
  imports: [TypeOrmModule.forFeature([sensor_data])],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
