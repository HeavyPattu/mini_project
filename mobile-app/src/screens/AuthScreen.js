import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { loginUser, registerUser, setApiBaseUrl, getApiBaseUrl } from '../services/api';

export default function AuthScreen({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('donor'); // 'donor' or 'center_operator'

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [operatorCode, setOperatorCode] = useState('');
  const [address, setAddress] = useState('');

  // Server IP config state
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Instant 1-tap Viva Demo Login
  const handleQuickDemoLogin = async (demoRole) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const demoEmail = demoRole === 'donor' ? 'donor@reroute.in' : 'admin@smkc.in';
      const demoPass = demoRole === 'donor' ? 'donor123' : 'admin123';
      const data = await loginUser(demoEmail, demoPass);
      if (data.success) {
        onAuthSuccess(data.user, data.token);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.detail || err.message || 'Connection to server failed. Verify backend IP.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (!isLogin && !name) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!isLogin && role === 'center_operator' && operatorCode.trim() !== 'SMKC-ADMIN') {
      setErrorMessage('Invalid Operator Secret Code. Contact SMKC Administration for access.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const data = await loginUser(email.trim(), password);
        if (data.success) {
          onAuthSuccess(data.user, data.token);
        }
      } else {
        const payload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          password: password,
          role: role,
          operator_code: role === 'center_operator' ? operatorCode.trim() : null,
          address: address.trim() || null,
        };
        const data = await registerUser(payload);
        if (data.success) {
          Alert.alert('Registration Successful', `Welcome to ReRoute Sangli-Miraj, ${data.user.name}!`);
          onAuthSuccess(data.user, data.token);
        }
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Operation failed. Check network connection.';
      setErrorMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServerUrl = () => {
    setApiBaseUrl(serverUrl);
    Alert.alert('Server URL Updated', `API endpoint set to:\n${getApiBaseUrl()}`);
    setShowServerConfig(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.badgeRow}>
            <Text style={styles.govBadge}>MAHARASHTRA • SMKC SANGLI</Text>
          </View>
          <Text style={styles.appTitle}>ReRoute</Text>
          <Text style={styles.appSubtitle}>
            Edge-AI Circular E-Waste & Hazardous Battery Safety Network
          </Text>
        </View>

        {/* Quick Demo Login Triggers */}
        <View style={styles.quickLoginCard}>
          <Text style={styles.quickLoginHeader}>⚡ 1-Tap Viva & Evaluation Logins</Text>
          <View style={styles.quickBtnRow}>
            <TouchableOpacity
              style={[styles.quickBtn, styles.quickBtnDonor]}
              onPress={() => handleQuickDemoLogin('donor')}
              disabled={loading}
            >
              <Text style={styles.quickBtnText}>👤 Citizen Portal</Text>
              <Text style={styles.quickBtnSub}>donor@reroute.in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBtn, styles.quickBtnOperator]}
              onPress={() => handleQuickDemoLogin('center_operator')}
              disabled={loading}
            >
              <Text style={styles.quickBtnText}>🛡️ SMKC Operator</Text>
              <Text style={styles.quickBtnSub}>admin@smkc.in</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Role Selector */}
        <View style={styles.roleSelectorWrapper}>
          <Text style={styles.inputLabel}>SELECT YOUR ACCESS ROLE</Text>
          <View style={styles.roleTabs}>
            <TouchableOpacity
              style={[styles.roleTab, role === 'donor' && styles.roleTabActive]}
              onPress={() => setRole('donor')}
            >
              <Text style={[styles.roleTabText, role === 'donor' && styles.roleTabTextActive]}>
                🌱 Citizen / Donor
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleTab, role === 'center_operator' && styles.roleTabActiveOperator]}
              onPress={() => setRole('center_operator')}
            >
              <Text
                style={[
                  styles.roleTabText,
                  role === 'center_operator' && styles.roleTabTextActiveOperator,
                ]}
              >
                🏭 Drive Operator
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Auth Mode Toggle (Login vs Register) */}
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            style={[styles.modeTab, isLogin && styles.modeTabActive]}
            onPress={() => {
              setIsLogin(true);
              setErrorMessage('');
            }}
          >
            <Text style={[styles.modeTabText, isLogin && styles.modeTabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, !isLogin && styles.modeTabActive]}
            onPress={() => {
              setIsLogin(false);
              setErrorMessage('');
            }}
          >
            <Text style={[styles.modeTabText, !isLogin && styles.modeTabTextActive]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        ) : null}

        {/* Form Fields */}
        <View style={styles.formCard}>
          {!isLogin && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name / Organization</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Rohan Patil / Walchand College"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. rohan@gmail.com"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {!isLogin && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Phone (for pickup SMS/WhatsApp)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="+91 98221 44550"
                placeholderTextColor="#64748B"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {!isLogin && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Residential / Facility Address (Sangli/Miraj)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Plot/Flat, Street, Vishrambag / Sangli / Miraj"
                placeholderTextColor="#64748B"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          {/* Operator Registration Secret Verification Code */}
          {!isLogin && role === 'center_operator' && (
            <View style={[styles.fieldGroup, styles.secretFieldGroup]}>
              <View style={styles.secretHeaderRow}>
                <Text style={styles.secretFieldLabel}>Municipal Operator Secret Code</Text>
                <Text style={styles.secretHint}>(Hint: SMKC-ADMIN)</Text>
              </View>
              <TextInput
                style={styles.secretInput}
                placeholder="SMKC-ADMIN"
                placeholderTextColor="#EF4444"
                value={operatorCode}
                onChangeText={setOperatorCode}
                autoCapitalize="characters"
              />
              <Text style={styles.secretSubtext}>
                Required for Sangli-Miraj-Kupwad municipal collection drive operators under Form 6 compliance.
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, role === 'center_operator' && styles.submitBtnOperator]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isLogin
                  ? role === 'center_operator'
                    ? 'Enter Operator Dashboard'
                    : 'Enter Citizen Portal'
                  : 'Complete Registration'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Server Endpoint Configuration Accordion */}
        <View style={styles.serverConfigContainer}>
          <TouchableOpacity
            style={styles.serverConfigHeader}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text style={styles.serverConfigTitle}>
              ⚙️ Server Endpoint: {getApiBaseUrl()} {showServerConfig ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {showServerConfig && (
            <View style={styles.serverConfigBody}>
              <Text style={styles.serverConfigHelp}>
                If testing via Expo Go on a physical phone, replace 'localhost' with your computer's local Wi-Fi IP (e.g. 192.168.1.15:8000).
              </Text>
              <TextInput
                style={styles.serverInput}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.x.x:8000"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.serverSaveBtn} onPress={handleSaveServerUrl}>
                <Text style={styles.serverSaveBtnText}>Save API Host</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeRow: {
    backgroundColor: '#1E293B',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  govBadge: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  appTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 15,
  },
  quickLoginCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickLoginHeader: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  quickBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickBtnDonor: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  quickBtnOperator: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  quickBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  quickBtnSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  roleSelectorWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleTabActive: {
    backgroundColor: '#10B981',
  },
  roleTabActiveOperator: {
    backgroundColor: '#F59E0B',
  },
  roleTabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
  },
  roleTabTextActiveOperator: {
    color: '#0F172A',
  },
  modeToggleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeTabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#10B981',
  },
  modeTabText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#F8FAFC',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
  },
  textArea: {
    minHeight: 55,
    textAlignVertical: 'top',
  },
  secretFieldGroup: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  secretHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  secretFieldLabel: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
  },
  secretHint: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  secretInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FEF2F2',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  secretSubtext: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 6,
  },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnOperator: {
    backgroundColor: '#F59E0B',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  serverConfigContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  serverConfigHeader: {
    paddingVertical: 2,
  },
  serverConfigTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  serverConfigBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  serverConfigHelp: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 8,
  },
  serverInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#F8FAFC',
    fontSize: 12,
    marginBottom: 8,
  },
  serverSaveBtn: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  serverSaveBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
});
