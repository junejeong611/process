# Azure AD Integration Implementation Guide

## Setup Instructions

### 1. Register Application in Azure AD

1. Go to Azure Portal (https://portal.azure.com)
2. Navigate to Azure Active Directory
3. Select "App registrations" > "New registration"
4. Enter application details:
   - Name: Your app name
   - Supported account types: Single tenant
   - Redirect URI: http://localhost:3000/auth/callback
5. After registration, note down:
   - Application (client) ID
   - Directory (tenant) ID
6. Create a client secret:
   - Go to "Certificates & secrets"
   - Create new client secret
   - Copy the secret value immediately (you won't be able to see it again)

### 2. Environment Configuration

1. Create `.env` file in the root directory
2. Copy values from `.env.example`
3. Fill in the Azure AD configuration values:
   ```
   AZURE_AD_TENANT_ID=your-tenant-id
   AZURE_AD_CLIENT_ID=your-client-id
   AZURE_AD_CLIENT_SECRET=your-client-secret
   AZURE_AD_REDIRECT_URI=http://localhost:3000/auth/callback
   ```

### 3. Install Dependencies

Backend:
```bash
npm install passport-azure-ad @azure/identity @microsoft/microsoft-graph-client
```

Frontend:
```bash
npm install @azure/msal-browser @azure/msal-react
```

## Authentication Flow

1. **Initial Login**:
   - User clicks "Sign in with Microsoft"
   - MSAL redirects to Azure AD login page
   - User authenticates with Microsoft credentials
   - Azure AD redirects back with authorization code
   - MSAL exchanges code for tokens
   - Backend validates token and creates/updates user

2. **Token Management**:
   - Access tokens stored in memory (MSAL cache)
   - Refresh tokens handled automatically by MSAL
   - Backend validates tokens using Azure AD configuration

3. **Session Management**:
   - Sessions maintained by MSAL
   - Automatic token refresh
   - Silent token acquisition for API calls

## User Data Management

### MongoDB User Model

```javascript
{
  azureId: String,      // Azure AD object ID
  email: String,        // User's email
  displayName: String,  // User's display name
  lastSync: Date,       // Last sync with Azure AD
  preferences: {
    theme: String,      // User preferences
    notifications: Boolean
  },
}
```

### Data Synchronization

1. **Initial Login**:
   - Create user record if not exists
   - Store basic profile information
   - Set lastSync timestamp

2. **Profile Updates**:
   - Sync user data on login
   - Update local cache with Azure AD data
   - Maintain application-specific data

## Testing Strategy

### Local Development Testing

1. **Authentication Flow**:
   ```bash
   # Start backend
   npm run dev

   # Start frontend
   cd client
   npm start
   ```

2. **Test Cases**:
   - Login with Microsoft account
   - Access protected routes
   - Token refresh
   - Logout functionality
   - Error handling

### API Testing with Postman

1. **Authentication**:
   - POST /api/auth/login
   - GET /api/auth/me
   - POST /api/auth/validate

2. **Protected Routes**:
   - Include Authorization header: `Bearer <token>`
   - Test token validation
   - Test unauthorized access

## Security Considerations

1. **Token Security**:
   - Store tokens in memory only
   - Use HTTPS in production
   - Implement proper token validation

2. **Error Handling**:
   - Handle token expiration
   - Implement proper error messages
   - Log security events

3. **Production Deployment**:
   - Update redirect URIs
   - Configure proper CORS settings
   - Use environment-specific configurations

## Troubleshooting

1. **Common Issues**:
   - Token validation failures
   - Redirect URI mismatches
   - CORS errors
   - Session management issues

2. **Debugging**:
   - Check browser console
   - Monitor network requests
   - Review server logs
   - Verify Azure AD configuration

## Additional Resources

- [Azure AD Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Passport Azure AD](https://github.com/AzureAD/passport-azure-ad) 