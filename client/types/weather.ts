export interface CurrentWeatherData {
  success: boolean;
  city: string;
  country:string;
  current: {
    timestamp: string;
    temp_c: number;
    temp_f: number;
    condition: string;
    humidity: number;
    wind_kph: number;
    uv_index: number;
    feels_like_c: number;
  };
}

export interface ForecastWeatherData {
  success: boolean;
  city: string;
  country:string;
  forecast: {
    timestamp: string;
    temp_c: number;
    temp_f: number;
    condition: string;
    humidity: number;
    wind_kph: number;
    uv_index: number;
    feels_like_c: number;
  };
}
  