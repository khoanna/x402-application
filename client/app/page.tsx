'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSendTransaction, usePublicClient, useBalance, useReadContract } from 'wagmi';
import { erc20Abi, parseEther } from 'viem';
import { USDCBalance } from '../components/USDCBalance';
import { useSmartAccount } from '../hooks/useSmartAccount';
import { getCurrentWeather, getForecastedWeather } from '../services/user.service';
import { CurrentWeatherData, ForecastWeatherData } from '../types/weather';
import { USDC_ADDRESS } from '@/libs/constants';

export default function Home() {
  const { address, isConnected, connector } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();
  const { 
    address: smartAccountAddress, 
    isLoading: smartAccountLoading, 
    isDeployed, 
    kernelClient,
    session,
    sessionLoading,
    sessionError,
    createSession,
    fetchSession,
    revokeSession,
  } = useSmartAccount();
  
  const [weather, setWeather] = useState<CurrentWeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastWeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const { data: eoaBalance } = useBalance({ address: address });
  const { data: saBalance, refetch: refetchSaBalance } = useBalance({ address: smartAccountAddress || undefined });

  const RECEIVER_ADDRESS = process.env.NEXT_PUBLIC_RECEIVER_ADDRESS || '0x88c45377C7653a3B5e42685cB74835f669D9A546';

  const { data: saUsdcBalance, refetch: refetchSaUsdc } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: smartAccountAddress ? [smartAccountAddress] : undefined,
    query: { enabled: !!smartAccountAddress }
  });

  // Load existing session when wallet connects
  useEffect(() => {
    if (address && isConnected) {
      fetchSession();
    }
  }, [address, isConnected]);

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

      if (!session) {
        setWeatherError('No active session. Please create a session first.');
        setLoadingWeather(false);
        return;
      }

      console.log('🌤️ Fetching weather data...');
      const data = await getCurrentWeather('vn-hcmc', session.sessionId);
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

      if (!session) {
        setForecastError('No active session. Please create a session first.');
        setLoadingForecast(false);
        return;
      }

      console.log('📊 Fetching forecast data...');
      const data = await getForecastedWeather('vn-hcmc', session.sessionId);
      setForecast(data);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      setForecastError('Failed to fetch forecast. Please try again.');
    } finally {
      setLoadingForecast(false);
    }
  }

  const handleCreateSession = async () => {
    const newSession = await createSession();
    if (newSession) {
      console.log('✅ Session created:', newSession);
    }
  };

  const handleRevokeSession = async () => {
    const success = await revokeSession();
    if (success) {
      console.log('✅ Session revoked');
    }
  };

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

          <div className="mt-4 p-4 border rounded-lg bg-black">
            <h2 className="text-xl font-semibold mb-3">Smart Account Info</h2>
            {smartAccountLoading ? (
              <p className="text-gray-600">Loading smart account...</p>
            ) : smartAccountAddress ? (
              <div className="space-y-2">
                <p>
                  <strong>Address:</strong>{' '}
                  <span className="font-mono text-sm break-all">{smartAccountAddress}</span>
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`px-2 py-1 rounded text-sm font-semibold ${isDeployed
                    ? 'bg-green-200 text-green-800'
                    : 'bg-yellow-200 text-yellow-800'
                    }`}>
                    {isDeployed ? '✓ Deployed' : '⏳ Not Deployed'}
                  </span>
                </p>
                {kernelClient && (
                  <p>
                    <strong>Client:</strong> <span className="text-green-600">✓ Connected</span>
                    <br />
                    <strong>ETH Balance:</strong> <span className="text-green-600">{saBalance?.formatted} {saBalance?.symbol}</span>
                    <br />
                    <strong>USDC Balance:</strong> <span className="text-green-600">{saUsdcBalance ? Number(saUsdcBalance) / 1e6 : '0'} USDC</span>
                  </p>
                  
                )}
              </div>
            ) : (
              <p className="text-gray-600">No smart account available. Connect your wallet first.</p>
            )}
          </div>

          {/* Session Management */}
          <div className="mt-4 p-4 border rounded-lg bg-black">
            <h2 className="text-xl font-semibold mb-3">Session Key Management</h2>
            
            {sessionError && (
              <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-800">
                {sessionError}
              </div>
            )}

            {session ? (
              <div className="space-y-2 text-sm">
                <p><strong>Session ID:</strong> <span className="font-mono text-xs break-all">{session.sessionId.slice(0, 12)}...</span></p>
                <p><strong>Status:</strong> <span className="px-2 py-1 bg-green-200 text-green-800 rounded font-semibold">{session.status}</span></p>
                <p><strong>Spending Limit:</strong> ${session.spendingLimit} USDC</p>
                <p><strong>Remaining Balance:</strong> ${session.remainingAmount.toFixed(4)} USDC</p>
                <p><strong>Created:</strong> {new Date(session.createdAt).toLocaleString()}</p>
                <p><strong>Expires:</strong> {new Date(session.expiresAt).toLocaleString()}</p>
                <p>
                  <strong>Public Key:</strong> <br />
                  <span className="font-mono text-xs break-all">{session.sessionKeySigner}</span>
                </p>
                
                <button
                  onClick={handleRevokeSession}
                  disabled={sessionLoading}
                  className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm w-full disabled:opacity-50"
                >
                  {sessionLoading ? 'Revoking...' : '🔒 Revoke Session'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-3">No active session. Create one to use smart account for API payments.</p>
                <button
                  onClick={handleCreateSession}
                  disabled={sessionLoading || !smartAccountAddress}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm w-full disabled:opacity-50"
                >
                  {sessionLoading ? 'Creating Session...' : '🔑 Create Session'}
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 p-4 border rounded-lg">
            <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="text-blue-700">
                💡 <strong>Note:</strong> Weather requests use the session key to pay from your smart account.
                {session && <span> Remaining: ${session.remainingAmount.toFixed(4)} USDC</span>}
              </p>
            </div>

            <button
              onClick={handleFetchWeather}
              disabled={loadingWeather || !address || !session}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm w-fit mb-2 disabled:opacity-50"
            >
              {loadingWeather ? 'Loading...' : '🌤️ Get Current Weather'}
            </button>

            {weatherError && (
              <div className="text-red-600 text-sm mb-2">{weatherError}</div>
            )}

            {weather && (
              <div className="mt-2 mb-4">
                <h2 className="text-lg font-semibold">Current Weather:</h2>
                <p>City: {weather.city}</p>
                <p>Country: {weather.country}</p>
                <p>Temperature: {weather.current?.temp_c} °C</p>
                <p>Condition: {weather.current?.condition}</p>
              </div>
            )}

            <button
              onClick={handleFetchForecastedWeather}
              disabled={loadingForecast || !address || !session}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm w-fit mb-2 disabled:opacity-50"
            >
              {loadingForecast ? 'Loading...' : '📊 Get Weather Forecast'}
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
