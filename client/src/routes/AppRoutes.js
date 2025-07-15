import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import Dashboard from '../components/dashboard/Dashboard';
import ChatInterface from '../components/chat/ChatInterface';
import ForgotPassword from '../components/auth/ForgotPassword';
import ResetPassword from '../components/auth/ResetPassword';
import ResetMfaRequest from '../components/auth/ResetMfaRequest';
import ResetMfaConfirm from '../components/auth/ResetMfaConfirm';
import ChatHistoryPage from '../components/history/ChatHistoryPage';
import ConversationDetailPage from '../components/history/ConversationDetailPage';
import OptionsPage from '../components/OptionsPage';
import InsightsPage from '../components/InsightsPage';
import VoicePage from '../components/VoicePage';
import ExitThankYouPage from '../components/ExitThankYouPage';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import SubscriptionPage from '../components/SubscriptionPage';
import PremiumRoute from '../components/subscription/PremiumRoute';
import SupportPage from '../components/SupportPage';
import SettingsPage from '../components/SettingsPage';
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
    {/* Public routes */}
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password/:token" element={<ResetPassword />} />
    <Route path="/reset-mfa-request" element={<ResetMfaRequest />} />
    <Route path="/reset-mfa-confirm/:token" element={<ResetMfaConfirm />} />
    <Route path="/crisis-support" element={<SupportPage />} />
    
    {/* Protected routes */}
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <DashboardLayout>
          <PremiumRoute>
            <Dashboard />
          </PremiumRoute>
        </DashboardLayout>
      </ProtectedRoute>
    } />
    
    {/* Options page - accessible to all authenticated users */}
    <Route path="/options" element={
      <ProtectedRoute>
        <DashboardLayout sidebarOffset={false}>
          <PremiumRoute>
            <OptionsPage />
          </PremiumRoute>
        </DashboardLayout>
      </ProtectedRoute>
    } />
    
    {/* Premium routes - require subscription */}
    <Route path="/chat" element={
      <ProtectedRoute>
        <DashboardLayout showUserMenuBar={false}>
          <PremiumRoute>
            <ChatLayout />
          </PremiumRoute>
        </DashboardLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/chat-history" element={
      <ProtectedRoute>
        <DashboardLayout sidebarOffset={false}>
          <PremiumRoute>
            <ChatHistoryPage />
          </PremiumRoute>
        </DashboardLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/chat-history/:id" element={
      <ProtectedRoute>
        <PremiumRoute>
          <ConversationDetailPage />
        </PremiumRoute>
      </ProtectedRoute>
    } />
    
    <Route path="/insights" element={
      <ProtectedRoute>
        <DashboardLayout sidebarOffset={false}>
          <PremiumRoute>
            <InsightsPage />
          </PremiumRoute>
        </DashboardLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/conversation" element={
      <ProtectedRoute>
        <DashboardLayout showUserMenuBar={false}>
          <PremiumRoute>
            <ChatInterface />
          </PremiumRoute>
        </DashboardLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/settings" element={
      <ProtectedRoute>
        <DashboardLayout sidebarOffset={false}>
          <SettingsPage />
        </DashboardLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/voice" element={
      <ProtectedRoute>
        <DashboardLayout showUserMenuBar={false}>
          <PremiumRoute>
            <VoicePage />
          </PremiumRoute>
        </DashboardLayout>
      </ProtectedRoute>
    } />
    
    {/* Subscription page - accessible to all authenticated users */}
    <Route path="/subscribe" element={
      <ProtectedRoute>
        <SubscriptionPage />
      </ProtectedRoute>
    } />
    
    {/* Exit page */}
    <Route path="/exit-thanks" element={
      <ProtectedRoute>
        <ExitThankYouPage />
      </ProtectedRoute>
    } />
    
    {/* Default redirect */}
    <Route path="*" element={<Navigate to="/dashboard" />} />
  </Routes>
);

export default AppRoutes;