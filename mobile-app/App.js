import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthScreen from './src/screens/AuthScreen';
import DonorHomeScreen from './src/screens/DonorHomeScreen';
import DonorHubsScreen from './src/screens/DonorHubsScreen';
import OperatorDashboardScreen from './src/screens/OperatorDashboardScreen';
import OperatorDispatchScreen from './src/screens/OperatorDispatchScreen';
import OperatorAnalyticsScreen from './src/screens/OperatorAnalyticsScreen';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  // Tab state:
  // For Donor: 'donor_home' | 'donor_hubs'
  // For Operator: 'operator_intake' | 'operator_dispatch' | 'operator_analytics'
  const [activeTab, setActiveTab] = useState('donor_home');

  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    // Set default tab based on user role
    if (user.role === 'center_operator') {
      setActiveTab('operator_intake');
    } else {
      setActiveTab('donor_home');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    setActiveTab('donor_home');
  };

  // Switch Role helper (e.g. for viva / testing without logging out)
  const toggleRoleForDemo = () => {
    if (!currentUser) return;
    const isNowOperator = currentUser.role !== 'center_operator';
    const updatedUser = {
      ...currentUser,
      role: isNowOperator ? 'center_operator' : 'donor',
      name: isNowOperator ? 'Sunil Deshmukh (SMKC Officer)' : 'Rohan Patil (Citizen)',
    };
    setCurrentUser(updatedUser);
    setActiveTab(isNowOperator ? 'operator_intake' : 'donor_home');
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </SafeAreaView>
    );
  }

  const isOperator = currentUser.role === 'center_operator';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Top Application Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandGroup}>
          <Text style={styles.topBarBrand}>ReRoute</Text>
          <View style={[styles.rolePill, isOperator ? styles.rolePillOperator : styles.rolePillDonor]}>
            <Text style={styles.rolePillText}>
              {isOperator ? 'OPERATOR' : 'CITIZEN'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.switchRoleBtn} onPress={toggleRoleForDemo}>
            <Text style={styles.switchRoleText}>
              🔄 {isOperator ? 'To Citizen' : 'To Operator'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Screen Body */}
      <View style={styles.screenContainer}>
        {/* Donor Views */}
        {!isOperator && activeTab === 'donor_home' && (
          <DonorHomeScreen currentUser={currentUser} />
        )}
        {!isOperator && activeTab === 'donor_hubs' && (
          <DonorHubsScreen currentUser={currentUser} />
        )}

        {/* Operator Views */}
        {isOperator && activeTab === 'operator_intake' && (
          <OperatorDashboardScreen currentUser={currentUser} />
        )}
        {isOperator && activeTab === 'operator_dispatch' && (
          <OperatorDispatchScreen currentUser={currentUser} />
        )}
        {isOperator && activeTab === 'operator_analytics' && (
          <OperatorAnalyticsScreen currentUser={currentUser} />
        )}
      </View>

      {/* Bottom Tab Navigation Bar */}
      <View style={styles.bottomNav}>
        {!isOperator ? (
          <>
            <TouchableOpacity
              style={[styles.navTab, activeTab === 'donor_home' && styles.navTabActive]}
              onPress={() => setActiveTab('donor_home')}
            >
              <Text style={styles.navIcon}>📷</Text>
              <Text
                style={[
                  styles.navLabel,
                  activeTab === 'donor_home' && styles.navLabelActive,
                ]}
              >
                AI Scanner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeTab === 'donor_hubs' && styles.navTabActive]}
              onPress={() => setActiveTab('donor_hubs')}
            >
              <Text style={styles.navIcon}>📍</Text>
              <Text
                style={[
                  styles.navLabel,
                  activeTab === 'donor_hubs' && styles.navLabelActive,
                ]}
              >
                Hubs & Green ID
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.navTab, activeTab === 'operator_intake' && styles.navTabActive]}
              onPress={() => setActiveTab('operator_intake')}
            >
              <Text style={styles.navIcon}>⚡</Text>
              <Text
                style={[
                  styles.navLabel,
                  activeTab === 'operator_intake' && styles.navLabelActiveOperator,
                ]}
              >
                Intake Scan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeTab === 'operator_dispatch' && styles.navTabActive]}
              onPress={() => setActiveTab('operator_dispatch')}
            >
              <Text style={styles.navIcon}>🚚</Text>
              <Text
                style={[
                  styles.navLabel,
                  activeTab === 'operator_dispatch' && styles.navLabelActiveOperator,
                ]}
              >
                Dispatch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeTab === 'operator_analytics' && styles.navTabActive]}
              onPress={() => setActiveTab('operator_analytics')}
            >
              <Text style={styles.navIcon}>📊</Text>
              <Text
                style={[
                  styles.navLabel,
                  activeTab === 'operator_analytics' && styles.navLabelActiveOperator,
                ]}
              >
                Form 6 & Certs
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarBrand: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rolePill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  rolePillDonor: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  rolePillOperator: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  rolePillText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchRoleBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchRoleText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutBtnText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '700',
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 20 : 6,
    justifyContent: 'space-around',
  },
  navTab: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  navTabActive: {
    backgroundColor: '#0F172A',
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  navLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  navLabelActive: {
    color: '#10B981',
  },
  navLabelActiveOperator: {
    color: '#F59E0B',
  },
});
