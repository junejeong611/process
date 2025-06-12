const isSubscriptionActive = (user) => {
  // Consider 'active' or 'trialing' as valid
  return user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
};

const isTrialValid = (user) => {
  if (!user.trialEnd) return false;
  return new Date() < new Date(user.trialEnd);
};

module.exports = function subscriptionProtection(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (isSubscriptionActive(user) || isTrialValid(user)) {
    return next();
  }
  return res.status(403).json({ error: 'Subscription or trial required to access this feature.' });
}; 