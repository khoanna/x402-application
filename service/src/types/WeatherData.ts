export interface WeatherData {
  id: string;
  location: {
    city: string;
    country: string;
    lat: number;
    long: number;
    timezone: string;
  };
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
  forecast: Array<{
    date: string;
    condition: string;
    temp_min_c: number;
    temp_max_c: number;
    rain_prob: number;
  }>;
}