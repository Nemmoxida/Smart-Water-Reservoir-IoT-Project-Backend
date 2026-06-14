import { Body, Controller, Get, Post } from '@nestjs/common';
import { arduinoService } from './arduino.service';
// import { jwtAuthGuard } from 'src/auth/guard/auth.guard';
import type { arduinoData } from './arduinoType';
import type { arduinoConfig } from './arduinoType';
import { readFile, writeFile } from 'fs/promises';

@Controller('arduino')
export class ArduinoController {
  constructor(private readonly ArduinoService: arduinoService) {}

  // @UseGuards(jwtAuthGuard)
  @Get()
  getArduino(): any {
    return this.ArduinoService.findAll();
  }

  // route for arduino to send data
  @Post('data')
  async postData(@Body() data: arduinoData): Promise<any> {
    console.log('trigger');
    let lastDistance: null | number = null;
    let delta: number = 0; // difference between previous and current disatance
    const filePath = './src/arduino/arduinoConfig.json';
    const fileContent = await readFile(filePath, 'utf-8');

    const jsonObject = JSON.parse(fileContent) as arduinoConfig;

    const configPath = './src/arduino/arduinoSystem.json';
    // eslint-disable-next-line
    const systemData = {
      system: data.system,
    };

    await writeFile(configPath, JSON.stringify(systemData));

    // for if the server started the variable will be null
    if (lastDistance == null) {
      lastDistance = await this.ArduinoService.latestData();
    }

    if (lastDistance < data.data.distance) {
      delta = data.data.distance - lastDistance;
    }

    await this.ArduinoService.insertData({
      distance: data.data.distance,
      delta: delta,
    });

    console.log('finish');

    // check if config from esp is outdated
    if (jsonObject.configVersion > data.configVersion) {
      return jsonObject;
    }
  }
}
