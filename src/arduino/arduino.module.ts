import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { sensor_data } from './arduino.entity';
import { ArduinoController } from './arduino.controller';
import { arduinoService } from './arduino.service';

@Module({
  imports: [TypeOrmModule.forFeature([sensor_data])],
  providers: [arduinoService],
  controllers: [ArduinoController],
})
export class ArduinoModule {}
