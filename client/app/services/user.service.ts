import { WeatherData } from "../types/weather";

export const getWeather = async (location: string): Promise<WeatherData> => {
  // This is a sample implementation.
  // In a real application, you would call a weather API here.
  
  // Simulating an API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock data
  return {
    success: true,
    count: 1,
    cities: [
      {
        city: location,
        country: "US",
        lat: 40.7128,
        long: -74.0060,
        timezone: "America/New_York",
        id: "123456",
      },
    ],
  };
};

export const getForecastedWeather = async (location: string): Promise<WeatherData> => {
  // This is a sample implementation.
  // In a real application, you would call a weather API here.
  
  // Simulating an API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock data
  return {
    success: true,
    count: 1,
    cities: [
      {
        city: location,
        country: "US",
        lat: 40.7128,
        long: -74.0060,
        timezone: "America/New_York",
        id: "123456",
      },
    ],
  };
}