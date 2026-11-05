import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Automatically detect host IP from Expo Go connection, environment variables, or LAN IP
const getInitialHost = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      Constants.manifest?.debuggerHost;

    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:8000`;
      }
    }
  } catch (e) {
    console.log('[API] Auto-detect host error:', e);
  }

  // Primary LAN IP for Sangli-Miraj ReRoute deployment
  return 'http://192.168.1.8:8000';
};

const DEFAULT_HOST = getInitialHost();

let currentBaseUrl = DEFAULT_HOST;

const api = axios.create({
  baseURL: currentBaseUrl,
  timeout: 45000,
  headers: {
    'Accept': 'application/json',
  },
});

export const setApiBaseUrl = (newUrl) => {
  if (!newUrl) return;
  let formattedUrl = newUrl.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    if (formattedUrl.includes('.onrender.com') || formattedUrl.includes('.railway.app') || !formattedUrl.match(/^\d+\.\d+\.\d+\.\d+/)) {
      formattedUrl = `https://${formattedUrl}`;
    } else {
      formattedUrl = `http://${formattedUrl}`;
    }
  }
  // If user pasted http:// for onrender.com, upgrade to https://
  if (formattedUrl.startsWith('http://') && formattedUrl.includes('.onrender.com')) {
    formattedUrl = formattedUrl.replace('http://', 'https://');
  }
  // Strip trailing slash
  if (formattedUrl.endsWith('/')) {
    formattedUrl = formattedUrl.slice(0, -1);
  }
  currentBaseUrl = formattedUrl;
  api.defaults.baseURL = currentBaseUrl;
  console.log(`[API Service] Base URL updated to: ${currentBaseUrl}`);
};

export const getApiBaseUrl = () => currentBaseUrl;

// 1. Authentication
export const loginUser = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post('/api/auth/register', userData);
  return response.data;
};

// 2. YOLOv8 E-Waste AI Inference Scan
export const scanImage = async (imageUri, source = 'donor_scan', base64Data = null) => {
  // If base64 is available, use JSON endpoint: 100% resilient across all Android devices & Axios
  if (base64Data) {
    try {
      const response = await api.post('/api/scan-json', {
        image_base64: base64Data,
        source: source,
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      });
      return response.data;
    } catch (jsonErr) {
      console.log('[API] JSON scan error, trying multipart fallback:', jsonErr?.message);
    }
  }

  const formData = new FormData();

  // Extract filename and mime type
  const filename = imageUri.split('/').pop() || 'scan_frame.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const type = ext === 'png' ? 'image/png' : 'image/jpeg';

  // Format URI properly for Android/iOS
  const cleanUri = Platform.OS === 'android' ? imageUri : imageUri.replace('file://', '');

  formData.append('file', {
    uri: cleanUri,
    name: filename,
    type: type,
  });
  formData.append('source', source);

  // NOTE: In React Native Axios, do NOT pass manual Content-Type: multipart/form-data.
  // React Native automatically generates the multipart boundary.
  const response = await api.post('/api/scan', formData, {
    headers: {
      'Accept': 'application/json',
    },
    timeout: 45000,
  });
  return response.data;
};

// 3. Components & Collection Centers
export const fetchComponents = async () => {
  const response = await api.get('/api/components');
  return response.data;
};

export const fetchCollectionCenters = async (acceptsHousehold = null) => {
  let url = '/api/centers';
  if (acceptsHousehold !== null) {
    url += `?accepts_household=${acceptsHousehold}`;
  }
  const response = await api.get(url);
  return response.data;
};

// 4. Pickups Workflow
export const schedulePickup = async (pickupPayload) => {
  const response = await api.post('/api/pickups', pickupPayload);
  return response.data;
};

export const fetchPickups = async (statusFilter = null) => {
  let url = '/api/pickups';
  if (statusFilter && statusFilter !== 'all') {
    url += `?status_filter=${statusFilter}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const updatePickupStatus = async (pickupId, status) => {
  const response = await api.patch(`/api/pickups/${pickupId}`, { status });
  return response.data;
};

// 5. Analytics & MPCB Form 6
export const fetchDriveAnalytics = async () => {
  const response = await api.get('/api/analytics');
  return response.data;
};

export const resetDriveAnalytics = async () => {
  const response = await api.delete('/api/analytics/reset');
  return response.data;
};

export const getForm6CsvDownloadUrl = () => {
  return `${currentBaseUrl}/api/export/form6-csv`;
};

// 6. Institutional Certificate Generator
export const generateCertificate = async (certificateData) => {
  const response = await api.post('/api/certificates/generate', certificateData);
  return response.data;
};

// 7. Health Check
export const checkApiHealth = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export default api;
