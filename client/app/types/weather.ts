export interface WeatherCity {
  city: string;
  country: string;
  lat: number;
  long: number;
  timezone: string;
  id: string;
}

export interface WeatherData {
  success: boolean;
  count: number;
  cities: WeatherCity[];
}

