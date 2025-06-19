import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import api from '../services/api.js';

const TokenDebug = () => {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [apiTestResult, setApiTestResult] = useState(null);
  const auth = useAuth();

  useEffect(() => {
    const checkToken = () => {
      try {
        const token = auth.getAccessToken();
        const user = auth.user;
        
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setTokenInfo({
              token: token.substring(0, 50) + '...',
              payload,
              user,
              isExpired: payload.exp * 1000 < Date.now()
            });
          } catch (error) {
            setTokenInfo({
              token: token.substring(0, 50) + '...',
              error: 'Token parse error',
              user
            });
          }
        } else {
          setTokenInfo(null);
        }
      } catch (error) {
        console.error('TokenDebug error:', error);
        setTokenInfo(null);
      }
    };

    checkToken();
    const interval = setInterval(checkToken, 5000); // Her 5 saniyede kontrol et
    
    return () => clearInterval(interval);
  }, [auth]);

  const testApiCall = async () => {
    try {
      setApiTestResult({ status: 'testing', message: 'Testing API call...' });
      
      // Test basket API call
      const response = await api.get('/basket-service/basket');
      
      setApiTestResult({ 
        status: 'success', 
        message: 'API call successful!',
        data: response.data 
      });
      
      console.log('✅ API Test Success:', response.data);
    } catch (error) {
      setApiTestResult({ 
        status: 'error', 
        message: error.message,
        error: error.response?.data || error.message
      });
      
      console.error('❌ API Test Error:', error);
    }
  };

  if (!tokenInfo) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: '10px', 
        right: '10px', 
        background: '#ff4444', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999
      }}>
        ❌ No Token Found
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: tokenInfo.isExpired ? '#ff4444' : '#44ff44', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '350px'
    }}>
      <div><strong>🔑 Token Status:</strong></div>
      <div>Authenticated: {auth.isAuthenticated() ? '✅' : '❌'}</div>
      <div>Expired: {tokenInfo.isExpired ? '❌' : '✅'}</div>
      <div>User: {tokenInfo.user?.username || 'Unknown'}</div>
      <div>Exp: {new Date(tokenInfo.payload?.exp * 1000).toLocaleString()}</div>
      
      <div style={{ marginTop: '10px' }}>
        <button 
          onClick={() => {
            console.log('Full Token:', auth.getAccessToken());
            console.log('Token Payload:', tokenInfo.payload);
            console.log('User:', tokenInfo.user);
          }}
          style={{ 
            background: 'white', 
            color: 'black', 
            border: 'none', 
            padding: '2px 5px', 
            marginRight: '5px',
            cursor: 'pointer'
          }}
        >
          Log Token
        </button>
        
        <button 
          onClick={testApiCall}
          style={{ 
            background: 'white', 
            color: 'black', 
            border: 'none', 
            padding: '2px 5px', 
            cursor: 'pointer'
          }}
        >
          Test API
        </button>
      </div>
      
      {apiTestResult && (
        <div style={{ 
          marginTop: '10px', 
          padding: '5px', 
          background: apiTestResult.status === 'success' ? '#44ff44' : 
                     apiTestResult.status === 'error' ? '#ff4444' : '#ffff44',
          color: 'black',
          borderRadius: '3px',
          fontSize: '10px'
        }}>
          <div><strong>API Test:</strong></div>
          <div>{apiTestResult.message}</div>
          {apiTestResult.data && (
            <div>Data: {JSON.stringify(apiTestResult.data).substring(0, 50)}...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenDebug; 