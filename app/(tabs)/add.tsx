import { Redirect } from 'expo-router';

// Placeholder route — the tab bar button opens an action menu instead of
// navigating here. If reached directly, bounce to the dashboard.
export default function Add() {
  return <Redirect href="/(tabs)/dashboard" />;
}
