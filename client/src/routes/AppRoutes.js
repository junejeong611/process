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
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/chat" element={<ProtectedRoute><ChatLayout /></ProtectedRoute>} />
    <Route path="/chat-history" element={<ProtectedRoute><ChatHistoryPage /></ProtectedRoute>} />
    <Route path="/chat-history/:id" element={<ProtectedRoute><ConversationDetailPage /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/login" />} />
  </Routes>
);

export default AppRoutes; 