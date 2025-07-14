# Styling Standardization Guide

## Overview

This guide covers our standardized styling system for consistent UI across the application. The standardized classes are defined in `src/index.css` and should be used consistently throughout the app.

## Button System

### Using the Button Component

The recommended approach is to use the `Button` component which automatically applies the standardized classes:

```jsx
import Button from './Button';

// Basic usage
<Button onClick={handleClick}>Click me</Button>

// With variants
<Button variant="secondary" onClick={handleClick}>Secondary</Button>
<Button variant="success" size="large" onClick={handleSubmit}>Submit</Button>

// Full width button
<Button variant="primary" fullWidth onClick={handleLogin}>Login</Button>

// Loading state
<Button variant="primary" loading onClick={handleSubmit}>Submit</Button>
```

### Available Button Props

- `variant`: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'gentle' | 'supportive' | 'calming'
- `size`: 'small' | 'default' | 'large'
- `fullWidth`: boolean
- `loading`: boolean
- `disabled`: boolean
- `type`: 'button' | 'submit' | 'reset'

### Direct Class Usage (Alternative)

If you need to use native HTML buttons, apply classes directly:

```jsx
// Basic button
<button className="app-button">Default Button</button>

// With variants
<button className="app-button app-button--primary">Primary</button>
<button className="app-button app-button--secondary app-button--small">Small Secondary</button>
<button className="app-button app-button--success app-button--full-width">Full Width Success</button>

// Multiple modifiers
<button className="app-button app-button--primary app-button--large app-button--loading">
  Loading...
</button>
```

### Mental Health Specific Variants

For therapeutic and calming interactions:

```jsx
<Button variant="gentle">Gentle Action</Button>
<Button variant="supportive">Encouraging Action</Button>
<Button variant="calming">Anxiety-Reducing Action</Button>
```

## Card System

### Available Card Classes

```jsx
// Basic card
<div className="app-card">Content</div>

// Card variants
<div className="app-card app-card--danger">Error content</div>
<div className="app-card app-card--minimal">Minimal styling</div>
<div className="app-card app-card--glass">Glass morphism effect</div>
<div className="app-card app-card--interactive">Hover effects</div>
<div className="app-card app-card--left-aligned">Left-aligned text</div>
```

## Error/Success Cards

### Standardized Error Cards

```jsx
<div className="error-card error-card--network">
  <div className="error-card__content">
    <div className="error-card__icon">🌐</div>
    <div className="error-card__text">
      <h3 className="error-card__title">Connection Error</h3>
      <p className="error-card__message">Please check your internet connection.</p>
    </div>
  </div>
  <div className="error-card__actions">
    <button className="error-card__retry" onClick={handleRetry}>
      Try Again
    </button>
  </div>
</div>
```

### Error Card Variants

- `error-card--success`: Success messages
- `error-card--warning`: Warning messages  
- `error-card--info`: Informational messages
- `error-card--network`: Network-related errors
- `error-card--auth`: Authentication errors
- `error-card--server`: Server errors
- `error-card--validation`: Validation errors

## Banner System

All banners are **automatically centered** for consistent alignment throughout the application.

### Basic Banner Usage

```jsx
<div className="app-banner app-banner--warning">
  <div className="app-banner__icon">⚠️</div>
  <div className="app-banner__content">
    <h4 className="app-banner__title">Trial Ending Soon</h4>
    <p className="app-banner__text">Your trial expires in 3 days.</p>
  </div>
  <div className="app-banner__actions">
    <button className="app-banner__button">Upgrade Now</button>
    <button className="app-banner__dismiss">×</button>
  </div>
</div>
```

### Banner Variants

- `app-banner--info`: Default informational
- `app-banner--success`: Success notifications
- `app-banner--warning`: Warnings
- `app-banner--error`: Error notifications
- `app-banner--trial`: Trial-specific messages
- `app-banner--subscription`: Subscription-related

## Form System

### Form Controls

```jsx
<div className="app-form-group">
  <label className="app-form-label" htmlFor="email">Email Address</label>
  <input 
    type="email" 
    id="email"
    className="app-form-control" 
    placeholder="Enter your email"
  />
  <div className="app-form-feedback app-form-feedback--invalid">
    Please enter a valid email
  </div>
</div>
```

### Form Control Variants

- `app-form-control--gentle`: Calming, therapeutic styling
- `app-form-control--comfortable`: Spacious, relaxed feel
- `app-form-control--mindful`: Mindfulness-focused styling
- `app-form-control--safe`: Safe space styling

## Migration from CSS Modules Composition

**BEFORE (Don't do this):**
```css
.my-button {
  composes: app-button app-button--primary; /* ❌ This doesn't work */
}
```

**AFTER (Correct approach):**
```jsx
// Option 1: Use the Button component
<Button variant="primary" className="my-button">Click me</Button>

// Option 2: Apply classes directly in JSX
<button className="app-button app-button--primary my-button">Click me</button>
```

```css
.my-button {
  /* Only add custom styles here, not composition */
  margin-top: 1rem;
}
```

## Best Practices

### 1. Consistency
- Always use the standardized classes for common UI elements
- Use the Button component for all buttons when possible
- Apply error card patterns consistently across the app

### 2. Accessibility
- All standardized components include WCAG AAA compliance
- 48px minimum touch targets
- Proper focus states and keyboard navigation
- Semantic HTML structure

### 3. Theming
- All colors use CSS custom properties from `:root`
- Supports prefers-color-scheme and prefers-reduced-motion
- High contrast mode support included

### 4. Mental Health Focus
- Use therapeutic variants (gentle, supportive, calming) for sensitive actions
- Consistent, calming visual language throughout
- Error states are supportive rather than alarming

## Troubleshooting

### Common Issues

1. **Buttons not styling correctly**: Make sure to use direct class names in JSX, not CSS composition
2. **Missing variables**: Ensure you're importing the main stylesheet where CSS variables are defined
3. **Specificity conflicts**: Use additional class names for overrides rather than `!important`

### Getting Help

- Check `src/index.css` for the complete list of available classes
- Use browser dev tools to inspect which classes are being applied
- Follow the examples in this guide for proper usage patterns 