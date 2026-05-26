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
    trial_used: '❌ Trial key ကို တစ်ကြိမ်သာ ထုတ်ခွင့်ရှိပါတယ်။',
    trial_generating: '⏳ Trial key ထုတ်ပေးနေပါတယ်...',
    trial_success: '🎁 Trial Key ရရှိပါပြီ!',
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
    mykey_title: '📦 *My Keys*',
    mykey_empty: 'Key မရှိသေးပါ။',
    mykey_trial: '🎁 *Trial Key:*',
    mykey_premium: '💎 *Premium Keys:*',
    mykey_copy_hint: '_Link ကို copy ပြီး VPN app ထဲ import လုပ်ပါ။_',
    mykey_get_trial: '🎁 Trial Key ထုတ်ယူမယ်',
    mykey_buy_premium: '💎 Premium Key ဝယ်မယ်',
    credit_balance: '💰 Credit Balance',
    credit_exchange: '🔄 Credit နဲ့ Key လဲမယ်',
    premium_buy_credit: '💎 Credit နဲ့ Premium ဝယ်မယ်',
    coupon_redeem: '🎟 Coupon Code ထည့်မယ်',
    no_credit: '❌ Credit မလုံလောက်ပါ',
    speed_test: '🚀 Speed Test',
    blacklist_reason: 'Ban အကြောင်းပြချက်',
  },
  en: {
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
    trial_used: '❌ You can only claim trial key once.',
    trial_generating: '⏳ Generating trial key...',
    trial_success: '🎁 Trial Key Received!',
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
    mykey_title: '📦 *My Keys*',
    mykey_empty: 'No keys yet.',
    mykey_trial: '🎁 *Trial Key:*',
    mykey_premium: '💎 *Premium Keys:*',
    mykey_copy_hint: '_Copy the link and import it into your VPN app._',
    mykey_get_trial: '🎁 Get Trial Key',
    mykey_buy_premium: '💎 Buy Premium Key',
    credit_balance: '💰 Credit Balance',
    credit_exchange: '🔄 Exchange Credit for Key',
    premium_buy_credit: '💎 Buy Premium with Credit',
    coupon_redeem: '🎟 Redeem Coupon Code',
    no_credit: '❌ Insufficient credits',
    speed_test: '🚀 Speed Test',
    blacklist_reason: 'Ban reason',
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
