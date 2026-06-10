import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { sensor_data } from './arduino.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class arduinoService {
  constructor(
    @InjectRepository(sensor_data)
    private arduinoRepository: Repository<sensor_data>,
  ) {}

  findAll(): Promise<sensor_data[]> {
    return this.arduinoRepository.find();
  }

  async insertData(data: any): Promise<any> {
    const res = await this.arduinoRepository.insert(data);

    return res;
  }

  async latestData(): Promise<number> {
    // eslint-disable-next-line
    const data: any = await this.arduinoRepository.query(
      'SELECT * from sensor_data ORDER BY id DESC LIMIT 1',
    );

    // eslint-disable-next-line
    return data[0].distance;
  }
}
