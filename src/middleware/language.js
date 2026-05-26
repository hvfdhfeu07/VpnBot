const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const LANG_FILE = path.join(DATA_DIR, 'languages.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LANG_FILE)) fs.writeFileSync(LANG_FILE, JSON.stringify({}, null, 2));
}

function loadLangs() {
  ensureFile();
  return JSON.parse(fs.readFileSync(LANG_FILE, 'utf8'));
}

function saveLangs(data) {
  ensureFile();
  fs.writeFileSync(LANG_FILE, JSON.stringify(data, null, 2));
}

function getUserLang(userId) {
  const data = loadLangs();
  return data[String(userId)] || 'mm';
}

function setUserLang(userId, lang) {
  const data = loadLangs();
  data[String(userId)] = lang;
  saveLangs(data);
}

const translations = {
  mm: {
    // Main menu
    welcome: '🔐 *VPN Key Bot*\n\nရွေးချယ်ပါ:',
    trial_key: '🎁 Trial Key',
    premium_key: '💎 Premium Key',
    my_key: '📦 My Key',
    referral: '👥 Referral',
    my_account: '👤 My Account',
    rating: '⭐ Rating',
    contact_admin: '📞 Admin ဆက်သွယ်ရန်',
    credit: '💰 Credit',
    coupon: '🎟 Coupon',
    language: '🌐 Language',
    back: '« Back to Menu',
    speed_test: '🚀 Speed Test',

    // Trial
    trial_used: '❌ Trial key ကို တစ်ကြိမ်သာ ထုတ်ခွင့်ရှိပါတယ်။',
    trial_generating: '⏳ Trial key ထုတ်ပေးနေပါတယ်...',
    trial_info_title: '🎁 *Trial Key*',
    trial_already_used: 'သင် trial key ယူပြီးပါပြီ။',
    trial_check_mykey: '📦 My Key မှာ ပြန်ကြည့်နိုင်ပါတယ်။',
    trial_view_mykey: '📦 My Key ကြည့်မယ်',
    trial_free_desc: 'Free trial key ထုတ်ယူနိုင်ပါတယ်!',
    trial_limit_warning: 'တစ်ယောက်ကို',
    trial_limit_times: 'ကြိမ် သာ ထုတ်ခွင့်ရှိပါတယ်။',
    trial_claim_btn: '🎁 Trial Key ထုတ်ယူမယ်',
    trial_data: '📦 Data',
    trial_expiry: '📅 Expiry',
    trial_device: '📱 Device Limit',
    trial_encryption: '🔐 Encryption',
    trial_received: '🎁 Trial Key ရရှိပါပြီ!',
    trial_copy_hint: 'Link ကို copy ပြီး VPN app ထဲ import လုပ်ပါ။',

    // My Keys
    mykey_title: '📦 *My Keys*',
    mykey_empty: 'Key မရှိသေးပါ။',
    mykey_trial: '🎁 *Trial Key:*',
    mykey_premium: '💎 *Premium Keys:*',
    mykey_copy_hint: '_Link ကို copy ပြီး VPN app ထဲ import လုပ်ပါ။_',
    mykey_get_trial: '🎁 Trial Key ထုတ်ယူမယ်',
    mykey_buy_premium: '💎 Premium Key ဝယ်မယ်',

    // Premium
    premium_title: '💎 <b>Premium Key (Credit System)</b>',
    premium_balance: '💰 <b>လက်ကျန်:</b>',
    premium_select_plan: 'Plan ရွေးပြီး Credit နဲ့ ဝယ်ယူပါ:',
    premium_my_orders: '📋 My Orders',
    premium_plan_not_found: '❌ Plan မတွေ့ပါ',
    premium_sufficient: '✅ Credit လုံလောက်ပါတယ်။ ဝယ်မယ် နှိပ်ပါ။',
    premium_insufficient: '❌ Credit မလုံလောက်ပါ။',
    premium_need_more: 'Credit ထပ်လိုပါတယ်။',
    premium_buy_btn: '💰 Credit နဲ့ ဝယ်မယ်',
    premium_topup_btn: '💰 Credit ထပ်ဝယ်မယ်',
    premium_select_type: 'Key အမျိုးအစား ရွေးပါ:',
    premium_no_server: '❌ ဒီ protocol အတွက် server မရှိသေးပါ။',
    premium_no_server_hint: 'Admin ကနေ Premium Control → protocol → server ထည့်ပြီး panel/inbound ချိတ်ဖို့ လိုပါတယ်။',
    premium_select_server: 'Server ရွေးပါ:',
    premium_no_panel: '❌ Server ကို panel ချိတ်မထားသေးပါ',
    premium_no_inbound: '❌ Server ကို inbound သတ်မှတ်မထားသေးပါ',
    premium_generating: '⏳ Premium key ထုတ်ပေးနေပါတယ်...',
    premium_received: '💎 Premium Key ရရှိပါပြီ!',

    // Credit
    credit_title: '💰 <b>Credit</b>',
    credit_your_balance: '💰 <b>လက်ကျန်:</b>',
    credit_history: '📋 မှတ်တမ်း',
    credit_no_history: 'မှတ်တမ်း မရှိသေးပါ',
    credit_topup: '💳 Credit ဝယ်ယူရန်',
    credit_topup_contact: '💳 Credit ဝယ်ယူလိုပါက Admin ကို ဆက်သွယ်ပါ:',

    // Referral
    referral_title: '👥 <b>Referral Program</b>',
    referral_your_link: '🔗 <b>Referral Link:</b>',
    referral_invited: '👥 <b>ခေါ်ထားသူ:</b>',
    referral_credit_earned: '💰 <b>ရရှိထားသော Credit:</b>',
    referral_share: '📤 Share ပေးပါ',
    referral_earn_hint: 'သူငယ်ချင်းတွေကို ခေါ်ပြီး Credit ရယူပါ!',

    // Account
    account_title: '👤 <b>My Account</b>',
    account_name: '<b>နာမည်:</b>',
    account_username: '<b>Username:</b>',
    account_id: '<b>ID:</b>',
    account_joined: '<b>စသုံးတဲ့နေ့:</b>',
    account_last_active: '<b>နောက်ဆုံးအသုံးပြု:</b>',
    account_status: '<b>Status:</b>',
    account_active: '🟢 Active',
    account_banned: '🚫 Banned',

    // Coupon
    coupon_title: '🎟 <b>Coupon</b>',
    coupon_enter: 'Coupon code ရိုက်ထည့်ပါ:',
    coupon_success: '✅ Coupon ရရှိပါပြီ!',
    coupon_cancel: '❌ Cancel',

    // Rating
    rating_title: '⭐ <b>Rating</b>',
    rating_prompt: 'Bot ကို rating ပေးပါ:',
    rating_thanks: '✅ Rating ပေးပြီးပါပြီ! ကျေးဇူးတင်ပါတယ်!',
    rating_feedback: '💬 Feedback ရေးပေးပါ (မရေးချင်ရင် /cancel):',
    rating_feedback_done: '✅ Feedback ရေးပြီးပါပြီ! ကျေးဇူးတင်ပါတယ်!',

    // Contact
    contact_title: '📞 <b>Admin ဆက်သွယ်ရန်</b>',

    // General
    banned_msg: '⛔ You are banned',
    join_channel: '📢 Bot ကို အသုံးပြုဖို့ Channel ကို join ပေးပါ:',
    join_check: '✅ Join ပြီးပြီ',
    menu_use: 'Menu ကို အသုံးပြုပါ:',
  },
  en: {
    // Main menu
    welcome: '🔐 *VPN Key Bot*\n\nSelect an option:',
    trial_key: '🎁 Trial Key',
    premium_key: '💎 Premium Key',
    my_key: '📦 My Key',
    referral: '👥 Referral',
    my_account: '👤 My Account',
    rating: '⭐ Rating',
    contact_admin: '📞 Contact Admin',
    credit: '💰 Credit',
    coupon: '🎟 Coupon',
    language: '🌐 Language',
    back: '« Back to Menu',
    speed_test: '🚀 Speed Test',

    // Trial
    trial_used: '❌ You can only claim trial key once.',
    trial_generating: '⏳ Generating trial key...',
    trial_info_title: '🎁 *Trial Key*',
    trial_already_used: 'You have already claimed a trial key.',
    trial_check_mykey: '📦 You can check it in My Key.',
    trial_view_mykey: '📦 View My Key',
    trial_free_desc: 'Get your free trial key!',
    trial_limit_warning: 'Limited to',
    trial_limit_times: 'time(s) per user.',
    trial_claim_btn: '🎁 Claim Trial Key',
    trial_data: '📦 Data',
    trial_expiry: '📅 Expiry',
    trial_device: '📱 Device Limit',
    trial_encryption: '🔐 Encryption',
    trial_received: '🎁 Trial Key Received!',
    trial_copy_hint: 'Copy the link and import it into your VPN app.',

    // My Keys
    mykey_title: '📦 *My Keys*',
    mykey_empty: 'No keys yet.',
    mykey_trial: '🎁 *Trial Key:*',
    mykey_premium: '💎 *Premium Keys:*',
    mykey_copy_hint: '_Copy the link and import it into your VPN app._',
    mykey_get_trial: '🎁 Get Trial Key',
    mykey_buy_premium: '💎 Buy Premium Key',

    // Premium
    premium_title: '💎 <b>Premium Key (Credit System)</b>',
    premium_balance: '💰 <b>Your Balance:</b>',
    premium_select_plan: 'Select a plan and buy with Credit:',
    premium_my_orders: '📋 My Orders',
    premium_plan_not_found: '❌ Plan not found',
    premium_sufficient: '✅ You have enough credits. Click Buy.',
    premium_insufficient: '❌ Insufficient credits.',
    premium_need_more: 'more credits needed.',
    premium_buy_btn: '💰 Buy with Credit',
    premium_topup_btn: '💰 Top Up Credit',
    premium_select_type: 'Select key type:',
    premium_no_server: '❌ No server available for this protocol.',
    premium_no_server_hint: 'Admin needs to add a server in Premium Control and link panel/inbound.',
    premium_select_server: 'Select server:',
    premium_no_panel: '❌ Server has no panel linked',
    premium_no_inbound: '❌ Server has no inbound configured',
    premium_generating: '⏳ Generating premium key...',
    premium_received: '💎 Premium Key Received!',

    // Credit
    credit_title: '💰 <b>Credit</b>',
    credit_your_balance: '💰 <b>Your Balance:</b>',
    credit_history: '📋 History',
    credit_no_history: 'No history yet',
    credit_topup: '💳 Top Up Credit',
    credit_topup_contact: '💳 To purchase credits, contact Admin:',

    // Referral
    referral_title: '👥 <b>Referral Program</b>',
    referral_your_link: '🔗 <b>Referral Link:</b>',
    referral_invited: '👥 <b>People Invited:</b>',
    referral_credit_earned: '💰 <b>Credits Earned:</b>',
    referral_share: '📤 Share',
    referral_earn_hint: 'Invite friends and earn credits!',

    // Account
    account_title: '👤 <b>My Account</b>',
    account_name: '<b>Name:</b>',
    account_username: '<b>Username:</b>',
    account_id: '<b>ID:</b>',
    account_joined: '<b>Joined:</b>',
    account_last_active: '<b>Last Active:</b>',
    account_status: '<b>Status:</b>',
    account_active: '🟢 Active',
    account_banned: '🚫 Banned',

    // Coupon
    coupon_title: '🎟 <b>Coupon</b>',
    coupon_enter: 'Enter coupon code:',
    coupon_success: '✅ Coupon redeemed!',
    coupon_cancel: '❌ Cancel',

    // Rating
    rating_title: '⭐ <b>Rating</b>',
    rating_prompt: 'Rate the bot:',
    rating_thanks: '✅ Thank you for rating!',
    rating_feedback: '💬 Leave feedback (type /cancel to skip):',
    rating_feedback_done: '✅ Thank you for your feedback!',

    // Contact
    contact_title: '📞 <b>Contact Admin</b>',

    // General
    banned_msg: '⛔ You are banned',
    join_channel: '📢 Please join the channel to use the bot:',
    join_check: '✅ I Joined',
    menu_use: 'Use the menu:',
  },
};

function t(userId, key) {
  const lang = getUserLang(userId);
  return (translations[lang] && translations[lang][key]) || translations.mm[key] || key;
}

module.exports = {
  getUserLang,
  setUserLang,
  t,
  translations,
};
