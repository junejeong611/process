import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import Dashboard from '../components/dashboard/Dashboard';
import ChatInterface from '../components/chat/ChatInterface';
import UserProfile from '../components/profile/UserProfile';
import ForgotPassword from '../components/auth/ForgotPassword';
import ResetPassword from '../components/auth/ResetPassword';
import ChatHistoryPage from '../components/history/ChatHistoryPage';
import ConversationDetailPage from '../components/history/ConversationDetailPage';
import OptionsPage from '../components/OptionsPage';
import InsightsPage from '../components/InsightsPage';
import VoicePage from '../components/VoicePage';
import ExitThankYouPage from '../components/ExitThankYouPage';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import SubscriptionPage from '../components/SubscriptionPage';
import PremiumRoute from '../components/subscription/PremiumRoute';
import './AppRoutes.css';

// Dummy authentication check (replace with real logic)
const isAuthenticated = () => {
  return !!(localStorage.getItem('token') || sessionStorage.getItem('token'));
};

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

const ChatLayout = () => (
  <div className="dashboard-container">
    <div className="chat-container">
      <ChatInterface />
    </div>
  </div>
);

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password/:token" element={<ResetPassword />} />
    <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
    <Route path="/chat" element={<ProtectedRoute><DashboardLayout><PremiumRoute><ChatLayout /></PremiumRoute></DashboardLayout></ProtectedRoute>} />
    <Route path="/chat-history" element={<ProtectedRoute><DashboardLayout><PremiumRoute><ChatHistoryPage /></PremiumRoute></DashboardLayout></ProtectedRoute>} />
    <Route path="/chat-history/:id" element={<ProtectedRoute><DashboardLayout><PremiumRoute><ConversationDetailPage /></PremiumRoute></DashboardLayout></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><DashboardLayout><UserProfile /></DashboardLayout></ProtectedRoute>} />
    <Route path="/options" element={<ProtectedRoute><DashboardLayout><PremiumRoute><OptionsPage /></PremiumRoute></DashboardLayout></ProtectedRoute>} />
    <Route path="/insights" element={<ProtectedRoute><DashboardLayout><PremiumRoute><InsightsPage /></PremiumRoute></DashboardLayout></ProtectedRoute>} />
    <Route path="/conversation" element={<ProtectedRoute><DashboardLayout><PremiumRoute><ChatInterface /></PremiumRoute></DashboardLayout></ProtectedRoute>} />
    <Route path="/voice" element={<ProtectedRoute><DashboardLayout><PremiumRoute><VoicePage /></PremiumRoute></DashboardLayout></ProtectedRoute>} />
    <Route path="/exit-thanks" element={<ProtectedRoute><ExitThankYouPage /></ProtectedRoute>} />
    <Route path="/subscribe" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/login" />} />
  </Routes>
);

export default AppRoutes; 