'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSendTransaction, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import { USDCBalance } from './components/USDCBalance';
import { getCurrentWeather } from './services/user.service';
import { CurrentWeatherData } from './types/weather';

export default function Home() {
  const { address, isConnected, connector } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();
  const [weather, setWeather] = useState<CurrentWeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  // const [sendTransactionState, setSendTransactionState] = useState<any>(false);

  const fetchTxnHash = async () => {
    return await sendTransactionAsync({
        to: address,
        value: parseEther('0'),
      });

  }

  const handleFetchWeather = async () => {
    try {
      setLoadingWeather(true);
      setWeatherError(null);
      // setSendTransactionState(false);
      
      // // Create a dummy transaction (sending 0 ETH to self)
      // if (address) {
      //   const txHash = await fetchTxnHash();
      //   // Wait until the transaction is confirmed before fetching weather
      //   if (publicClient) {
      //     await publicClient.waitForTransactionReceipt({ hash: txHash });
      //   }
      //   console.log('Transaction confirmed:', txHash);
      // }

      const data = await getCurrentWeather('vn-hcmc');
      setWeather(data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      setWeatherError('Failed to fetch weather. Please try again.');
    } finally {
      setLoadingWeather(false);

      // console.log('Transaction sent:', txn);
    }
  }

  const handleFetchForecastedWeather = async () => {
    // Similar implementation to handleFetchWeather but for forecasted weather
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
            <button
              onClick={handleFetchWeather}
              disabled={loadingWeather || !address}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm w-fit mb-2"
            >
              {loadingWeather ? 'Loading Weather...' : 'Get Weather'}
            </button>

            {weatherError && (
              <div className="text-red-600 text-sm mb-2">{weatherError}</div>
            )}

            {weather && (
              <div className="mt-2">
                <h2 className="text-lg font-semibold">Weather Information:</h2>
                <p>City: {weather.city}</p>
                <p>Country: {weather.country}</p>
                <p>Temperature: {weather.current.temp_c} °C</p>
                <p>Condition: {weather.current.condition}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
