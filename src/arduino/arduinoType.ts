export type arduinoConfig = {
  configVersion: number;
  currenTime: Date;
  config: {
    override: boolean;
    isOn: boolean;
    treshold: number;
    isTimer: boolean;
    timerDelay: number;
  };
};

export type arduinoData = {
  configVersion: number;
  data: {
    distance: number;
  };
  system: {
    totalUpTime: number;
    internalTime: number;
    chipTemp: number;
    availableMem: number;
    wifiSignal: number;
  };
};
