import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra || {};

// Production backend powering https://www.gps-eu.com
export const API_URL = 'https://gps-fleet-platform-production.up.railway.app';

export const GOOGLE_MAPS_API_KEY = extra.googleMapsApiKey || 'AIzaSyBI8V98lmgxJz-NNQdF5c6sEzWkInMp0Uc';


