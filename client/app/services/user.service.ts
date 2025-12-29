import axios from 'axios';
import { CurrentWeatherData } from "../types/weather";
import { ForecastWeatherData } from "../types/weather";

const API_BASE_URL = 'http://localhost:3001'; // Backend URL

export const getCurrentWeather = async (location: string): Promise<CurrentWeatherData> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/weather/current?id=${location}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching current weather:', error);
    throw error;
  }
};

export const getForecastedWeather = async (location: string): Promise<ForecastWeatherData> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/weather/forecast?id=${location}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching forecasted weather:', error);
    throw error;
  }
};