import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { LoadingState } from '../../components/feedback/LoadingState';
import { AuthNavigator } from './AuthNavigator';
import { ClientNavigator } from './ClientNavigator';
import { WorkerNavigator } from './WorkerNavigator';
import { useAuth } from '../../context/AuthContext';
import { useRenderKeepAwake } from '../../hooks/useKeepAwake';

export function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  useRenderKeepAwake();
  if (isLoading) {
    return <LoadingState message="Starting Worko..." />;
  }

  const renderAppLayer = () => {
    if (!isAuthenticated || !user) {
      return <AuthNavigator />;
    }

    if (user.role === 'WORKER') {
      return <WorkerNavigator />;
    }

    // Default to Client for CLIENT, ADMIN, etc. in the mobile app scope
    return <ClientNavigator />;
  };


  return (
    <NavigationContainer>
      {renderAppLayer()}
    </NavigationContainer>
  );
}