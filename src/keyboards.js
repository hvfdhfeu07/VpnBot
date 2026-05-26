const { t } = require('./middleware/language');

function getMainMenuKeyboard(userId) {
  return {
    inline_keyboard: [
      [
        { text: t(userId, 'trial_key'), callback_data: 'trial_key' },
        { text: t(userId, 'premium_key'), callback_data: 'premium_menu' },
      ],
      [
        { text: t(userId, 'my_key'), callback_data: 'menu_mykey' },
        { text: t(userId, 'referral'), callback_data: 'referral_menu' },
      ],
      [
        { text: t(userId, 'credit'), callback_data: 'credit_menu' },
        { text: t(userId, 'coupon'), callback_data: 'coupon_menu' },
      ],
      [
        { text: t(userId, 'my_account'), callback_data: 'my_account' },
        { text: t(userId, 'rating'), callback_data: 'rating_menu' },
      ],
      [
        { text: t(userId, 'speed_test'), callback_data: 'speed_test' },
        { text: t(userId, 'language'), callback_data: 'language_menu' },
      ],
      [
        { text: t(userId, 'contact_admin'), callback_data: 'contact_admin' },
      ],
    ],
  };
}

function getBackKeyboard(userId) {
  return {
    inline_keyboard: [
      [{ text: t(userId, 'back'), callback_data: 'back_to_menu' }],
    ],
  };
}

module.exports = {
  getMainMenuKeyboard,
  getBackKeyboard,
};
