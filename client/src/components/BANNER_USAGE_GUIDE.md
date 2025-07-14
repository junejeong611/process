# Unified Banner System Usage Guide

## Overview
The unified banner system consolidates all alert, notification, and banner components into a single, consistent design system. This replaces the previous scattered banner styles across components. **All banners are now centered by default** for consistent alignment across the application.

## Base Structure

```html
<div class="app-banner [variants] [contexts] [sizes] [utilities]">
  <div class="app-banner__icon">🔔</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Banner Title</div>
    <div class="app-banner__text">Banner description text</div>
  </div>
  <div class="app-banner__actions">
    <button class="app-banner__button">Action</button>
    <button class="app-banner__dismiss">×</button>
  </div>
</div>
```

## Variants

### Info Banner (Default)
```html
<div class="app-banner app-banner--info">
  <div class="app-banner__icon">ℹ️</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Information</div>
    <div class="app-banner__text">This is an informational message.</div>
  </div>
</div>
```

### Success Banner
```html
<div class="app-banner app-banner--success">
  <div class="app-banner__icon">✅</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Success</div>
    <div class="app-banner__text">Operation completed successfully.</div>
  </div>
</div>
```

### Warning Banner
```html
<div class="app-banner app-banner--warning">
  <div class="app-banner__icon">⚠️</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Warning</div>
    <div class="app-banner__text">Please review before proceeding.</div>
  </div>
</div>
```

### Error Banner
```html
<div class="app-banner app-banner--error">
  <div class="app-banner__icon">❌</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Error</div>
    <div class="app-banner__text">Something went wrong. Please try again.</div>
  </div>
</div>
```

### Loading Banner
```html
<div class="app-banner app-banner--loading">
  <div class="app-banner__icon">⏳</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Loading</div>
    <div class="app-banner__text">Please wait while we process your request.</div>
  </div>
</div>
```

### Trial Banner
```html
<div class="app-banner app-banner--trial">
  <div class="app-banner__icon">🎯</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Trial Ending Soon</div>
    <div class="app-banner__text">Your trial ends in 3 days.</div>
  </div>
  <div class="app-banner__actions">
    <button class="app-banner__button">Upgrade Now</button>
  </div>
</div>
```

### Subscription Banner
```html
<div class="app-banner app-banner--subscription">
  <div class="app-banner__icon">💎</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Premium Features</div>
    <div class="app-banner__text">Unlock all features with a subscription.</div>
  </div>
  <div class="app-banner__actions">
    <button class="app-banner__button">Subscribe</button>
  </div>
</div>
```

## Contexts

### Page Level (Hero banners)
```html
<div class="app-banner app-banner--warning app-banner--page-level">
  <div class="app-banner__icon">🚨</div>
  <div class="app-banner__content">
    <div class="app-banner__title">System Maintenance</div>
    <div class="app-banner__text">Scheduled maintenance will occur on Sunday at 2 AM EST.</div>
  </div>
</div>
```

### Inline (Within content)
```html
<div class="app-banner app-banner--info app-banner--inline">
  <div class="app-banner__icon">💡</div>
  <div class="app-banner__content">
    <div class="app-banner__text">Tip: You can save time by using keyboard shortcuts.</div>
  </div>
</div>
```

### Floating (Toast-like)
```html
<div class="app-banner app-banner--success app-banner--floating">
  <div class="app-banner__icon">✅</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Saved</div>
    <div class="app-banner__text">Your changes have been saved.</div>
  </div>
  <button class="app-banner__dismiss">×</button>
</div>
```

### Sticky (Top of page)
```html
<div class="app-banner app-banner--error app-banner--sticky">
  <div class="app-banner__icon">🌐</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Connection Error</div>
    <div class="app-banner__text">Unable to connect to server. Retrying...</div>
  </div>
</div>
```

## Sizes

### Compact
```html
<div class="app-banner app-banner--info app-banner--compact">
  <div class="app-banner__icon">ℹ️</div>
  <div class="app-banner__content">
    <div class="app-banner__text">Brief notification message.</div>
  </div>
</div>
```

### Standard (Default)
```html
<div class="app-banner app-banner--info">
  <div class="app-banner__icon">ℹ️</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Standard Banner</div>
    <div class="app-banner__text">Normal sized banner with title and text.</div>
  </div>
</div>
```

### Large
```html
<div class="app-banner app-banner--success app-banner--large">
  <div class="app-banner__icon">🎉</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Welcome!</div>
    <div class="app-banner__text">Thank you for joining our platform. Get started with our quick tour.</div>
  </div>
  <div class="app-banner__actions">
    <button class="app-banner__button">Start Tour</button>
  </div>
</div>
```

## Utility Classes

### Dismissible
```html
<div class="app-banner app-banner--warning app-banner--dismissible">
  <div class="app-banner__icon">⚠️</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Cookies Notice</div>
    <div class="app-banner__text">We use cookies to improve your experience.</div>
  </div>
  <button class="app-banner__dismiss">×</button>
</div>
```

### Centered
```html
<div class="app-banner app-banner--info app-banner--centered">
  <div class="app-banner__icon">📢</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Announcement</div>
    <div class="app-banner__text">New features coming soon!</div>
  </div>
</div>
```

### No Icon
```html
<div class="app-banner app-banner--info app-banner--no-icon">
  <div class="app-banner__content">
    <div class="app-banner__title">Simple Banner</div>
    <div class="app-banner__text">Banner without an icon.</div>
  </div>
</div>
```

## Migration Guide

### From Old Patterns to New Banner System

#### 1. Connection Banner (ChatInterface)
**Old:**
```css
.connection-banner.loading {
  background: linear-gradient(135deg, var(--warning-orange) 0%, #ffa726 100%);
  color: #ffffff;
}
```

**New:**
```html
<div class="app-banner app-banner--loading app-banner--sticky">
  <div class="app-banner__icon">⏳</div>
  <div class="app-banner__content">
    <div class="app-banner__text">Connecting to server...</div>
  </div>
</div>
```

#### 2. Subscription Status Banner
**Old:**
```css
.subscription-status-banner.trial {
  background: #fff;
  border: 3.5px solid var(--border-light);
}
```

**New:**
```html
<div class="app-banner app-banner--trial app-banner--page-level">
  <div class="app-banner__icon">🎯</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Free Trial Active</div>
    <div class="app-banner__text">You have 5 days remaining.</div>
  </div>
  <div class="app-banner__actions">
    <button class="app-banner__button">Manage Subscription</button>
  </div>
</div>
```

#### 3. Trial Banner
**Old:**
```css
.trial-banner {
  background: linear-gradient(135deg, #fffbe6 0%, #fff8dc 100%);
  border: 1px solid #ffe58f;
}
```

**New:**
```html
<div class="app-banner app-banner--trial app-banner--compact">
  <div class="app-banner__icon">⏰</div>
  <div class="app-banner__content">
    <div class="app-banner__text">Trial ends in 3 days! <a href="/subscribe">Upgrade now</a></div>
  </div>
</div>
```

#### 4. Error/Success Messages
**Old:**
```css
.error-message {
  background: linear-gradient(90deg, #fff6f6 80%, #f7fafd 100%);
  color: var(--error-red);
}
```

**New:**
```html
<div class="app-banner app-banner--error app-banner--inline">
  <div class="app-banner__icon">❌</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Authentication Error</div>
    <div class="app-banner__text">Invalid credentials. Please try again.</div>
  </div>
</div>
```

#### 5. Offline Indicator
**Old:**
```css
.offline-indicator {
  background: rgba(255, 243, 224, 0.95);
  color: var(--warning-orange);
}
```

**New:**
```html
<div class="app-banner app-banner--warning app-banner--floating">
  <div class="app-banner__icon">🌐</div>
  <div class="app-banner__content">
    <div class="app-banner__title">Offline</div>
    <div class="app-banner__text">You're currently offline. Some features may be limited.</div>
  </div>
</div>
```

## React Component Example

```jsx
import React, { useState } from 'react';

const Banner = ({ 
  variant = 'info', 
  context = '', 
  size = '', 
  dismissible = false, 
  centered = false,
  noIcon = false,
  icon,
  title,
  text,
  actions,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!isVisible) return null;

  const classes = [
    'app-banner',
    variant && `app-banner--${variant}`,
    context && `app-banner--${context}`,
    size && `app-banner--${size}`,
    dismissible && 'app-banner--dismissible',
    centered && 'app-banner--centered',
    noIcon && 'app-banner--no-icon'
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {!noIcon && icon && (
        <div className="app-banner__icon">{icon}</div>
      )}
      <div className="app-banner__content">
        {title && <div className="app-banner__title">{title}</div>}
        {text && <div className="app-banner__text">{text}</div>}
      </div>
      {actions && (
        <div className="app-banner__actions">
          {actions.map((action, index) => (
            <button key={index} className="app-banner__button" onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      )}
      {dismissible && (
        <button className="app-banner__dismiss" onClick={handleDismiss}>
          ×
        </button>
      )}
    </div>
  );
};

export default Banner;
```

## Usage Examples

```jsx
// Basic info banner
<Banner
  variant="info"
  icon="ℹ️"
  title="Did you know?"
  text="You can use keyboard shortcuts to navigate faster."
/>

// Trial warning with action
<Banner
  variant="trial"
  context="page-level"
  icon="⏰"
  title="Trial Ending Soon"
  text="Your free trial ends in 3 days."
  actions={[
    { label: 'Upgrade Now', onClick: () => handleUpgrade() }
  ]}
/>

// Dismissible error banner
<Banner
  variant="error"
  dismissible
  icon="❌"
  title="Connection Error"
  text="Unable to save changes. Please check your internet connection."
  onDismiss={() => console.log('Banner dismissed')}
/>

// Floating success notification
<Banner
  variant="success"
  context="floating"
  dismissible
  icon="✅"
  title="Saved"
  text="Your changes have been saved successfully."
/>
```

## Best Practices

1. **Use semantic variants** - Choose the variant that matches the message intent
2. **Keep text concise** - Banners should be scannable and actionable
3. **Include relevant icons** - Use emojis or icon fonts for better visual hierarchy
4. **Consider context** - Use appropriate contexts for different placements
5. **Make actions clear** - Button text should be specific and actionable
6. **Test accessibility** - Ensure proper ARIA roles and keyboard navigation
7. **Be consistent** - Use the same patterns throughout your application

## Accessibility Features

- **ARIA roles** automatically applied based on variant
- **Keyboard navigation** support for dismiss buttons
- **Screen reader** compatible with proper semantic markup
- **High contrast** mode support
- **Reduced motion** support for users with motion sensitivity 