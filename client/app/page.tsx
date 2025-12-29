'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSendTransaction, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import { USDCBalance } from './components/USDCBalance';
import { getCurrentWeather, getForecastedWeather } from './services/user.service';
import { CurrentWeatherData, ForecastWeatherData } from './types/weather';

export default function Home() {
  const { address, isConnected, connector } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();
  const [weather, setWeather] = useState<CurrentWeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastWeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  // const [sendTransactionState, setSendTransactionState] = useState<any>(false);

  const RECEIVER_ADDRESS = process.env.NEXT_PUBLIC_RECEIVER_ADDRESS || '0x88c45377C7653a3B5e42685cB74835f669D9A546';

  const sendSigningTransaction = async (): Promise<boolean> => {
    if (!address) {
      setWeatherError('Wallet not connected');
      return false;
    }

    try {
      // Send 0 USDC transaction to receiver address
      const txHash = await sendTransactionAsync({
        to: RECEIVER_ADDRESS as `0x${string}`,
        value: parseEther('0'),
      });

      // Wait for transaction confirmation
      if (publicClient && txHash) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log('✅ Transaction confirmed:', txHash);
        return receipt.status === 'success';
      }

      return true;
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Transaction signing failed';
      setWeatherError(`Transaction failed: ${errorMessage}`);
      return false;
    }
  };

  const handleFetchWeather = async () => {
    try {
      setLoadingWeather(true);
      setWeatherError(null);

      // Step 1: Send signing transaction
      console.log('📝 Requesting transaction signature...');
      const txSuccess = await sendSigningTransaction();
      
      if (!txSuccess) {
        console.error('Transaction not completed');
        return;
      }

      // Step 2: Fetch weather after transaction confirmation
      console.log('🌤️ Fetching weather data...');
      const data = await getCurrentWeather('vn-hcmc');
      setWeather(data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      setWeatherError('Failed to fetch weather. Please try again.');
    } finally {
      setLoadingWeather(false);
    }
  }

  const handleFetchForecastedWeather = async () => {
    try {
      setLoadingForecast(true);
      setForecastError(null);

      // Step 1: Send signing transaction
      console.log('📝 Requesting transaction signature...');
      const txSuccess = await sendSigningTransaction();
      
      if (!txSuccess) {
        console.error('Transaction not completed');
        setForecastError('Transaction failed. Please try again.');
        return;
      }

      // Step 2: Fetch forecast after transaction confirmation
      console.log('📊 Fetching forecast data...');
      const data = await getForecastedWeather('vn-hcmc');
      setForecast(data);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      setForecastError('Failed to fetch forecast. Please try again.');
    } finally {
      setLoadingForecast(false);
    }
  }

  const handleSwitchAccount = async () => {
    if (!connector) return;
    try {
      const provider = await connector.getProvider();
      // @ts-ignore
      await provider.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      console.error('Failed to switch account:', error);
    }
  };

  

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 text-4xl font-bold">Wallet Connection</h1>

      <ConnectButton />

      {isConnected && (
        <>
          <div className="mt-8 p-4 border rounded-lg flex flex-col gap-2">
            <p>Wallet is connected!</p>
            <p className="font-mono">Address: {address}</p>
            <button
              onClick={handleSwitchAccount}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm w-fit"
            >
              Switch Account
            </button>
          </div>
          <USDCBalance />

          <div className="mt-4 p-4 border rounded-lg">
            <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="text-blue-700">💡 <strong>Note:</strong> Weather requests require transaction signature for payment verification.</p>
            </div>

            <button
              onClick={handleFetchWeather}
              disabled={loadingWeather || !address}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm w-fit mb-2 disabled:opacity-50"
            >
              {loadingWeather ? 'Signing & Loading...' : 'Get Current Weather (Sign Tx)'}
            </button>

            {weatherError && (
              <div className="text-red-600 text-sm mb-2">{weatherError}</div>
            )}

            {weather && (
              <div className="mt-2 mb-4">
                <h2 className="text-lg font-semibold">Current Weather:</h2>
                <p>City: {weather.city}</p>
                <p>Country: {weather.country}</p>
                <p>Temperature: {weather.current.temp_c} °C</p>
                <p>Condition: {weather.current.condition}</p>
              </div>
            )}

            <button
              onClick={handleFetchForecastedWeather}
              disabled={loadingForecast || !address}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm w-fit mb-2 disabled:opacity-50"
            >
              {loadingForecast ? 'Signing & Loading...' : 'Get Weather Forecast (Sign Tx)'}
            </button>

            {forecastError && (
              <div className="text-red-600 text-sm mb-2">{forecastError}</div>
            )}

            {forecast && (
              <div className="mt-2">
                <h2 className="text-lg font-semibold">3-Day Forecast:</h2>
                <p>City: {forecast.city}</p>
                <p>Country: {forecast.country}</p>
                <div className="mt-2">
                  {forecast.forecast && Array.isArray(forecast.forecast) ? (
                    forecast.forecast.map((day: any, index: number) => (
                      <div key={index} className="text-sm mb-2 p-2 bg-gray-100 rounded">
                        <p><strong>Date:</strong> {day.date}</p>
                        <p><strong>Condition:</strong> {day.condition}</p>
                        <p><strong>Min:</strong> {day.temp_min_c} °C | <strong>Max:</strong> {day.temp_max_c} °C</p>
                        <p><strong>Rain Prob:</strong> {day.rain_prob}%</p>
                      </div>
                    ))
                  ) : (
                    <p>No forecast data available</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
