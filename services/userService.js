const User = require('../models/User');
const stripeService = require('./stripeService');

const deleteUserAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // If the user has an active Stripe subscription, cancel it immediately
  if (user.stripeSubscriptionId) {
    try {
      await stripeService.cancelSubscription(user.stripeSubscriptionId);
      console.log(`Successfully canceled Stripe subscription for user: ${userId}`);
    } catch (error) {
      // Log the error but proceed with deletion.
      // We don't want to block account deletion if Stripe fails.
      console.error(`Failed to cancel Stripe subscription for user ${userId}:`, error.message);
    }
  }

  // Delete the user from the database
  await User.findByIdAndDelete(userId);
  console.log(`Successfully deleted user account: ${userId}`);

  return { message: 'Account deleted successfully' };
};

module.exports = {
  deleteUserAccount,
}; 