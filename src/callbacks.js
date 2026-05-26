const { getMainMenuKeyboard, getBackKeyboard } = require('./keyboards');
const { hasUsedTrial, createTrialKey, getTrialConfig, getTrialInfo } = require('./vpn/trialManager');
const { getPlans, createOrder, getUserPremiumKeys } = require('./vpn/premiumManager');
const { getUserReferral, getReferralCode, getReferralConfig } = require('./vpn/referralManager');
const { getBalance, getUserCredits, deductCredits, getCreditSettings, redeemCoupon } = require('./vpn/creditManager');
const xuiClient = require('./vpn/xuiClient');
const { getFirstPremiumPanel, getClient } = require('./vpn/panelManager');
const { getUser } = require('./admin/userManager');
const { logUserAction, logKeyClaimWithQR } = require('./middleware/userLogger');
const { getUserLang, setUserLang, t } = require('./middleware/language');
const QRCode = require('qrcode');

async function handleCallback(bot, query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = String(query.from.id);
  const data = query.data;

  bot.answerCallbackQuery(query.id);

  // ─── Main Menu ─────────────────────────────────────────────
  if (data === 'back_to_menu') {
    // If current message is a photo (QR code), delete it and send a new text message
    if (query.message.photo || query.message.document) {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      return bot.sendMessage(chatId, t(userId, 'welcome'), {
        parse_mode: 'Markdown',
        reply_markup: getMainMenuKeyboard(userId),
      });
    }
    return bot.editMessageText(t(userId, 'welcome'), {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(userId),
    });
  }

  // ─── Trial Key ─────────────────────────────────────────────
  if (data === 'trial_key') {
    if (hasUsedTrial(userId)) {
      return bot.editMessageText(
        `${t(userId, 'trial_info_title')}\n\n` +
        `${t(userId, 'trial_used')}\n` +
        `${t(userId, 'trial_already_used')}\n\n` +
        `${t(userId, 'trial_check_mykey')}`,
        {
          chat_id: chatId, message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: t(userId, 'trial_view_mykey'), callback_data: 'menu_mykey' }],
              [{ text: t(userId, 'back'), callback_data: 'back_to_menu' }],
            ],
          },
        }
      );
    }

    const config = getTrialConfig();
    // Get actual encryption from inbound
    let encryptionMethod = 'aes-256-gcm';
    try {
      const { getServerById } = require('./vpn/serverList');
      const { getPanel, getClient: getPanelClient, getFirstTrialPanel } = require('./vpn/panelManager');
      const server = config.serverId ? getServerById(config.serverId) : null;
      const panelId = (server && server.panelId) ? server.panelId : config.panelId;
      const trialPanel = panelId ? getPanel(panelId) : getFirstTrialPanel();
      const client = trialPanel ? getPanelClient(trialPanel.id) : xuiClient;
      const inboundId = (server && server.inboundId) ? server.inboundId : config.inboundId;
      const inbound = await client.getInbound(inboundId);
      if (inbound) {
        const settings = JSON.parse(inbound.settings);
        if (settings.method) encryptionMethod = settings.method;
      }
    } catch {}
    return bot.editMessageText(
      `${t(userId, 'trial_info_title')}\n\n` +
      `${t(userId, 'trial_free_desc')}\n\n` +
      `${t(userId, 'trial_data')}: *${config.totalGB} GB*\n` +
      `${t(userId, 'trial_expiry')}: *${config.expiryDays} Days*\n` +
      `${t(userId, 'trial_device')}: *${config.ipLimit}*\n` +
      `${t(userId, 'trial_encryption')}: *${encryptionMethod}*\n\n` +
      `⚠️ ${t(userId, 'trial_limit_warning')} *${config.maxTrials}* ${t(userId, 'trial_limit_times')}`,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: t(userId, 'trial_claim_btn'), callback_data: 'trial_claim' }],
            [{ text: t(userId, 'back'), callback_data: 'back_to_menu' }],
          ],
        },
      }
    );
  }

  if (data === 'trial_claim') {
    if (hasUsedTrial(userId)) {
      return bot.editMessageText(
        t(userId, 'trial_used'),
        {
          chat_id: chatId, message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: getBackKeyboard(userId),
        }
      );
    }

    bot.editMessageText(t(userId, 'trial_generating'), {
      chat_id: chatId, message_id: messageId,
    });

    const result = await createTrialKey(userId, query.from.username || query.from.first_name);

    if (!result.success) {
      return bot.editMessageText(`❌ ${result.msg}`, {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(userId),
      });
    }

    const d = result.data;
    const config = getTrialConfig();
    const expiryDate = new Date(d.expiryDate).toLocaleDateString('en-GB');

    logKeyClaimWithQR(bot, query.from, {
      email: d.email,
      dataGB: d.dataGB,
      expiryDate,
      ipLimit: d.ipLimit,
      link: d.link,
      inbound: d.inboundRemark || '',
    }, 'Trial');

    const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const customMsg = config.customMessage ? `\n${escHtml(config.customMessage)}\n` : '';

    const caption =
      `<b>${t(userId, 'trial_received')}</b>\n\n` +
      `📅 Expiry: <b>${expiryDate}</b>\n` +
      `📦 Data: <b>${d.dataGB} GB</b>\n` +
      `📱 Device: <b>${d.ipLimit}</b>\n\n` +
      `🔗 <b>Config Link:</b>\n<code>${escHtml(d.link)}</code>\n` +
      customMsg +
      `\n<i>${t(userId, 'trial_copy_hint')}</i>`;

    try {
      const qrBuffer = await QRCode.toBuffer(d.link, { width: 300, margin: 2 });
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await bot.sendPhoto(chatId, qrBuffer, {
        caption,
        parse_mode: 'HTML',
        reply_markup: getBackKeyboard(userId),
      });
    } catch {
      await bot.editMessageText(caption, {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: getBackKeyboard(userId),
      });
    }
    return;
  }

  // ─── Premium Key Menu (Credit System) ──────────────────────
  if (data === 'premium_menu') {
    const settings = getCreditSettings();
    const balance = getBalance(userId);
    let text = `${t(userId, 'premium_title')}\n\n` +
      `${t(userId, 'premium_balance')} ${balance} Credit\n\n` +
      `${t(userId, 'premium_select_plan')}\n\n`;

    const buttons = settings.premiumPlans.map((p) => [
      {
        text: `${p.name} | ${p.days}d | ${p.credits} Credit`,
        callback_data: `premium_credit_${p.id}`,
      },
    ]);
    buttons.push([{ text: t(userId, 'premium_my_orders'), callback_data: 'premium_orders' }]);
    buttons.push([{ text: t(userId, 'back'), callback_data: 'back_to_menu' }]);

    return bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons },
    });
  }

  // ─── Premium Buy with Credit ──────────────────────────────
  if (data.startsWith('premium_credit_')) {
    const planId = data.replace('premium_credit_', '');
    const settings = getCreditSettings();
    const plan = settings.premiumPlans.find(p => p.id === planId);
    if (!plan) {
      return bot.editMessageText(t(userId, 'premium_plan_not_found'), {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(userId),
      });
    }
    const balance = getBalance(userId);

    return bot.editMessageText(
      `💎 <b>${plan.name}</b>\n\n` +
      `${t(userId, 'trial_data')}: <b>${plan.dataGB} GB</b>\n` +
      `${t(userId, 'trial_expiry')}: <b>${plan.days} Days</b>\n` +
      `${t(userId, 'trial_device')}: <b>${plan.ipLimit}</b>\n` +
      `💰 Price: <b>${plan.credits} Credit</b>\n\n` +
      `${t(userId, 'premium_balance')} <b>${balance} Credit</b>\n\n` +
      (balance >= plan.credits
        ? t(userId, 'premium_sufficient')
        : `${t(userId, 'premium_insufficient')} ${plan.credits - balance} ${t(userId, 'premium_need_more')}`),
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: balance >= plan.credits
            ? [
                [{ text: t(userId, 'premium_buy_btn'), callback_data: `premium_buy_credit_${planId}` }],
                [{ text: '« Plans', callback_data: 'premium_menu' }],
              ]
            : [
                [{ text: t(userId, 'premium_topup_btn'), callback_data: 'credit_menu' }],
                [{ text: '« Plans', callback_data: 'premium_menu' }],
              ],
        },
      }
    );
  }

  // ─── Premium Buy: Step 1 - Protocol Selection ─────────────
  if (data.startsWith('premium_buy_credit_')) {
    const planId = data.replace('premium_buy_credit_', '');
    const settings = getCreditSettings();
    const plan = settings.premiumPlans.find(p => p.id === planId);
    if (!plan) {
      return bot.editMessageText(t(userId, 'premium_plan_not_found'), {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(userId),
      });
    }

    const balance = getBalance(userId);
    if (balance < plan.credits) {
      return bot.editMessageText(t(userId, 'premium_insufficient'), {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(userId),
      });
    }

    return bot.editMessageText(
      `💎 <b>${plan.name}</b>\n\n` +
      `${t(userId, 'premium_select_type')}`,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔒 Shadowsocks', callback_data: `prem_proto_${planId}_shadowsocks` }],
            [{ text: '⚡ VLESS', callback_data: `prem_proto_${planId}_vless` }],
            [{ text: '🌐 VMess', callback_data: `prem_proto_${planId}_vmess` }],
            [{ text: '« Back', callback_data: `premium_credit_${planId}` }],
          ],
        },
      }
    );
  }

  // ─── Premium Buy: Step 2 - Server Selection ───────────────
  if (data.startsWith('prem_proto_')) {
    const rest = data.replace('prem_proto_', '');
    const lastUnderscore = rest.lastIndexOf('_');
    const planId = rest.substring(0, lastUnderscore);
    const protocol = rest.substring(lastUnderscore + 1);

    const settings = getCreditSettings();
    const plan = settings.premiumPlans.find(p => p.id === planId);
    if (!plan) {
      return bot.editMessageText(t(userId, 'premium_plan_not_found'), {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(userId),
      });
    }

    const { getProtocolServers, getProtocolLabel } = require('./vpn/premiumConfig');
    const servers = getProtocolServers(protocol).filter(s =>
      s.status === 'online' && s.panelId && s.inboundId
    );

    if (servers.length === 0) {
      return bot.editMessageText(
        `${t(userId, 'premium_no_server')}\n\n${t(userId, 'premium_no_server_hint')}`,
        {
          chat_id: chatId, message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: '« Back', callback_data: `premium_buy_credit_${planId}` }]] },
        }
      );
    }

    const protoLabel = { shadowsocks: '🔒 Shadowsocks', vless: '⚡ VLESS', vmess: '🌐 VMess' };
    const buttons = servers.map(s => [{
      text: `🖥 ${s.name}`,
      callback_data: `prem_gen_${planId}_${protocol}_${s.id}`,
    }]);
    buttons.push([{ text: '« Back', callback_data: `premium_buy_credit_${planId}` }]);

    return bot.editMessageText(
      `💎 <b>${plan.name}</b> — ${protoLabel[protocol] || protocol}\n\n${t(userId, 'premium_select_server')}`,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons },
      }
    );
  }

  // ─── Premium Buy: Step 3 - Generate Key ───────────────────
  if (data.startsWith('prem_gen_')) {
    const rest = data.replace('prem_gen_', '');
    const parts = rest.split('_');
    // planId can contain underscores (e.g. cp_100), protocol is the second-to-last, serverId is last
    const serverId = parseInt(parts[parts.length - 1]);
    const protocol = parts[parts.length - 2];
    const planId = parts.slice(0, parts.length - 2).join('_');

    const settings = getCreditSettings();
    const plan = settings.premiumPlans.find(p => p.id === planId);
    if (!plan) {
      return bot.editMessageText(t(userId, 'premium_plan_not_found'), {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(userId),
      });
    }

    const { getProtocolServerById } = require('./vpn/premiumConfig');
    const { getPanel: getPanelById } = require('./vpn/panelManager');
    const server = getProtocolServerById(protocol, serverId);
    if (!server || !server.panelId) {
      return bot.editMessageText(t(userId, 'premium_no_panel'), {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(userId),
      });
    }
    if (!server.inboundId) {
      return bot.editMessageText(t(userId, 'premium_no_inbound'), {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(userId),
      });
    }

    const result = deductCredits(userId, plan.credits, `Premium: ${plan.name}`);
    if (!result) {
      return bot.editMessageText(t(userId, 'premium_insufficient'), {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(userId),
      });
    }

    bot.editMessageText(t(userId, 'premium_generating'), {
      chat_id: chatId, message_id: messageId,
    });

    try {
      const crypto = require('crypto');
      const panel = getPanelById(server.panelId);
      const premClient = getClient(server.panelId);
      const premServerHost = panel ? panel.serverHost : (process.env.PREMIUM_XUI_SERVER_HOST || '');

      const inbound = await premClient.getInbound(server.inboundId);
      if (!inbound) {
        return bot.editMessageText('❌ Inbound not found on panel', {
          chat_id: chatId, message_id: messageId,
          reply_markup: getBackKeyboard(),
        });
      }

      const inboundSettings = JSON.parse(inbound.settings);
      const shortId = crypto.randomBytes(3).toString('hex');
      const uname = (query.from.username || '').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 5);
      const email = `p_${uname || 'u'}_${shortId}`;

      const clientConfig = premClient.createClientConfig(email, {
        expiryDays: plan.days,
        totalGB: plan.dataGB * 1024 * 1024 * 1024,
        limitIp: plan.ipLimit || 2,
        tgId: String(userId),
        protocol: inbound.protocol,
        method: inboundSettings.method || 'aes-256-gcm',
      });

      const addRes = await premClient.addClient(server.inboundId, clientConfig);
      if (!addRes.success) {
        return bot.editMessageText(`❌ ${addRes.msg || 'Failed to create key'}`, {
          chat_id: chatId, message_id: messageId,
          reply_markup: getBackKeyboard(),
        });
      }

      const link = premClient.generateLink(inbound, clientConfig, premServerHost);
      const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const expiryDate = new Date(Date.now() + plan.days * 86400000).toLocaleDateString('en-GB');

      logKeyClaimWithQR(bot, query.from, {
        email, dataGB: plan.dataGB, expiryDate, ipLimit: plan.ipLimit || 2, link,
        inbound: inbound.remark || '',
      }, 'Premium (Credit)');

      const { savePremiumKey } = require('./vpn/premiumManager');
      savePremiumKey(userId, {
        email, link, planId: plan.id, planName: plan.name,
        dataGB: plan.dataGB, days: plan.days, server: server.name,
        serverHost: premServerHost, inboundId: server.inboundId,
        panelId: server.panelId, protocol: inbound.protocol,
      });

      const protoLabel = { shadowsocks: '🔒 SS', vless: '⚡ VLESS', vmess: '🌐 VMess' };
      const caption =
        `💎 <b>Premium Key ရရှိပါပြီ!</b>\n\n` +
        `📦 Plan: <b>${plan.name}</b>\n` +
        `📅 Expiry: <b>${expiryDate}</b>\n` +
        `📦 Data: <b>${plan.dataGB} GB</b>\n` +
        `📱 Device: <b>${plan.ipLimit || 2}</b>\n` +
        `💰 Used: <b>${plan.credits} Credit</b>\n` +
        `🖥 Server: <b>${escHtml(server.name)}</b>\n` +
        `🔒 Protocol: <b>${protoLabel[inbound.protocol] || inbound.protocol}</b>\n\n` +
        `🔗 <b>Config Link:</b>\n<code>${escHtml(link)}</code>`;

      try {
        const qrBuffer = await QRCode.toBuffer(link, { width: 300, margin: 2 });
        await bot.deleteMessage(chatId, messageId).catch(() => {});
        await bot.sendPhoto(chatId, qrBuffer, {
          caption, parse_mode: 'HTML', reply_markup: getBackKeyboard(),
        });
      } catch {
        await bot.editMessageText(caption, {
          chat_id: chatId, message_id: messageId,
          parse_mode: 'HTML', reply_markup: getBackKeyboard(),
        });
      }
    } catch (err) {
      return bot.editMessageText(`❌ ${err.message}`, {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(),
      });
    }
    return;
  }

  // ─── Premium Plan Select (old payment flow, still available) ──
  if (data.startsWith('premium_select_')) {
    const planId = data.replace('premium_select_', '');
    const plans = getPlans();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return bot.editMessageText('❌ Plan မတွေ့ပါ။', {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(),
      });
    }

    return bot.editMessageText(
      `💎 *${plan.name}*\n\n` +
      `📦 Data: *${plan.dataGB} GB*\n` +
      `📅 Duration: *${plan.days} Days*\n` +
      `📱 Devices: *${plan.ipLimit}*\n` +
      `💰 Price: *${plan.price} Ks*\n\n` +
      `ဝယ်ယူမယ်ဆိုရင် *"ဝယ်ယူမယ်"* ကို နှိပ်ပါ။\n` +
      `Payment screenshot ပို့ပေးရပါမယ်။`,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💰 ဝယ်ယူမယ်', callback_data: `premium_buy_${planId}` }],
            [{ text: '« Plans', callback_data: 'premium_menu' }],
          ],
        },
      }
    );
  }

  if (data.startsWith('premium_buy_')) {
    const planId = data.replace('premium_buy_', '');
    const order = createOrder(userId, planId);
    if (!order) {
      return bot.editMessageText('❌ Plan မတွေ့ပါ။', {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(),
      });
    }

    logUserAction(bot, query.from, '💎 Premium Order Created',
      `📋 Order: \`${order.orderId}\`\n` +
      `📦 Plan: ${order.planName} (${order.dataGB}GB/${order.days}Days)\n` +
      `💰 Price: ${order.price} Ks`
    );

    return bot.editMessageText(
      `💎 *Order Created!*\n\n` +
      `📋 Order ID: \`${order.orderId}\`\n` +
      `📦 Plan: *${order.planName}* (${order.dataGB}GB/${order.days}Days)\n` +
      `💰 Price: *${order.price} Ks*\n\n` +
      `*ငွေလွှဲနည်း:*\n` +
      `Admin ထံ ငွေလွှဲပြီး screenshot ကို\n` +
      `ဒီ bot ထဲ ပို့ပေးပါ။\n\n` +
      `Screenshot ပို့ရင် Order ID ပါ ရေးပေးပါ:\n` +
      `\`${order.orderId}\`\n\n` +
      `_Admin approve လုပ်ပြီးရင် key auto ထုတ်ပေးပါမယ်။_`,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📞 Admin ထံ ဆက်သွယ်မယ်', url: process.env.ADMIN_CONTACT || 'https://t.me/JackFrozt_2k4' }],
            [{ text: '« Back to Menu', callback_data: 'back_to_menu' }],
          ],
        },
      }
    );
  }

  // ─── Premium Orders ───────────────────────────────────────
  if (data === 'premium_orders') {
    const { getUserOrders } = require('./vpn/premiumManager');
    const orders = getUserOrders(userId);

    if (orders.length === 0) {
      return bot.editMessageText(
        '📋 *My Orders*\n\nOrder မရှိသေးပါ။',
        {
          chat_id: chatId, message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💎 Premium Key ဝယ်မယ်', callback_data: 'premium_menu' }],
              [{ text: '« Back', callback_data: 'back_to_menu' }],
            ],
          },
        }
      );
    }

    const statusEmoji = { pending: '⏳', approved: '✅', rejected: '❌' };
    let text = '📋 *My Orders*\n\n';
    for (const o of orders.slice(-5).reverse()) {
      text += `${statusEmoji[o.status] || '❓'} \`${o.orderId}\`\n` +
        `   ${o.planName} | ${o.price} Ks | ${o.status}\n\n`;
    }

    return bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💎 Premium Key ဝယ်မယ်', callback_data: 'premium_menu' }],
          [{ text: '« Back', callback_data: 'back_to_menu' }],
        ],
      },
    });
  }

  // ─── Credit Menu ──────────────────────────────────────────
  if (data === 'credit_menu') {
    const balance = getBalance(userId);
    const settings = getCreditSettings();
    const ref = getUserReferral(userId);
    const lang = getUserLang(userId);

    const earnMethods = lang === 'en'
      ? `<b>How to earn Credit:</b>\n` +
        `• 👥 Invite 1 friend = ${settings.referralCredit} Credit\n` +
        `• 🎟 Use Coupon Code\n` +
        `• Buy Credit from Admin`
      : `<b>Credit ရနည်း:</b>\n` +
        `• 👥 Referral invite 1 ယောက် = ${settings.referralCredit} Credit\n` +
        `• 🎟 Coupon Code သုံးပြီး ရယူ\n` +
        `• Admin ဆီက Credit ဝယ်ယူ`;

    const useMethods = lang === 'en'
      ? `<b>How to use Credit:</b>\n` +
        `• 🔄 Exchange Credit for Key (${settings.creditPerGB} Credit = 1 GB)\n` +
        `• 💎 Buy Premium Plan with Credit`
      : `<b>Credit သုံးနည်း:</b>\n` +
        `• 🔄 Credit နဲ့ Key လဲ (${settings.creditPerGB} Credit = 1 GB)\n` +
        `• 💎 Credit နဲ့ Premium Plan ဝယ်`;

    return bot.editMessageText(
      `${t(userId, 'credit_title')}\n\n` +
      `${t(userId, 'credit_your_balance')} ${balance} Credit\n` +
      `👥 <b>Referral:</b> ${ref.totalCreditsEarned || 0} Credit\n\n` +
      `${earnMethods}\n\n` +
      `${useMethods}`,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: t(userId, 'credit_exchange'), callback_data: 'credit_exchange' }],
            [{ text: t(userId, 'premium_key'), callback_data: 'premium_menu' }],
            [{ text: t(userId, 'credit_topup'), callback_data: 'credit_purchase' }],
            [{ text: t(userId, 'credit_history'), callback_data: 'credit_history' }],
            [{ text: t(userId, 'back'), callback_data: 'back_to_menu' }],
          ],
        },
      }
    );
  }

  // ─── Credit Exchange (Credit → Key) ──────────────────────
  if (data === 'credit_exchange') {
    const balance = getBalance(userId);
    const settings = getCreditSettings();
    const rate = settings.creditPerGB || 0.1;

    const options = [5, 10, 20, 50, 100];
    const buttons = options.map(gb => {
      const cost = parseFloat((gb * rate).toFixed(2));
      return [{ text: `${gb} GB — ${cost} Credit`, callback_data: `credit_buy_${gb}` }];
    });
    buttons.push([{ text: t(userId, 'back'), callback_data: 'credit_menu' }]);

    const lang = getUserLang(userId);
    const selectGB = lang === 'en' ? 'Select GB for your key:' : 'Key ထုတ်ယူချင်တဲ့ GB ရွေးပါ:';
    return bot.editMessageText(
      `${t(userId, 'credit_exchange')}\n\n` +
      `${t(userId, 'credit_your_balance')} ${balance} Credit\n` +
      `📊 <b>Rate:</b> ${rate} Credit = 1 GB\n\n` +
      selectGB,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons },
      }
    );
  }

  if (data.startsWith('credit_buy_')) {
    const gb = parseInt(data.replace('credit_buy_', ''));
    const settings = getCreditSettings();
    const rate = settings.creditPerGB || 0.1;
    const cost = parseFloat((gb * rate).toFixed(2));
    const balance = getBalance(userId);

    if (balance < cost) {
      return bot.editMessageText(
        `${t(userId, 'premium_insufficient')}\n\n💰 Balance: ${balance}\n💰 Required: ${cost}`,
        {
          chat_id: chatId, message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '« Back', callback_data: 'credit_exchange' }],
            ],
          },
        }
      );
    }

    const result = deductCredits(userId, cost, `Key Exchange: ${gb}GB`);
    if (!result) {
      return bot.editMessageText('❌ Credit deduct failed', {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(),
      });
    }

    bot.editMessageText('⏳ Key ထုတ်ပေးနေပါတယ်...', {
      chat_id: chatId, message_id: messageId,
    });

    try {
      // Use server → panel chain for trial, fall back to panelManager or env var
      const { getTrialConfig } = require('./vpn/trialManager');
      const { getServerById } = require('./vpn/serverList');
      const { getPanel: getPanelById, getFirstTrialPanel } = require('./vpn/panelManager');
      const trialConfig = getTrialConfig();
      const trialServer = trialConfig.serverId ? getServerById(trialConfig.serverId) : null;
      const trialPanelId = (trialServer && trialServer.panelId) ? trialServer.panelId : trialConfig.panelId;
      const trialPanel = trialPanelId ? getPanelById(trialPanelId) : getFirstTrialPanel();
      const activeClient = trialPanel ? getClient(trialPanel.id) : xuiClient;
      const serverHost = trialPanel ? trialPanel.serverHost : (process.env.XUI_SERVER_HOST || '178.128.80.123');

      const inboundId = settings.referralKeyInboundId || parseInt(process.env.TRIAL_INBOUND_ID) || 1;
      const inbound = await activeClient.getInbound(inboundId);
      if (!inbound) {
        return bot.editMessageText('❌ Inbound not found', {
          chat_id: chatId, message_id: messageId,
          reply_markup: getBackKeyboard(),
        });
      }

      const inboundSettings = JSON.parse(inbound.settings);
      const email = `credit_${userId}_${Date.now()}`;
      const clientConfig = activeClient.createClientConfig(email, {
        expiryDays: 30,
        totalGB: gb * 1024 * 1024 * 1024,
        limitIp: 1,
        tgId: String(userId),
        protocol: inbound.protocol,
        method: inboundSettings.method || 'aes-256-gcm',
      });

      const res = await activeClient.addClient(inboundId, clientConfig);
      if (!res.success) {
        return bot.editMessageText(`❌ ${res.msg || 'Failed'}`, {
          chat_id: chatId, message_id: messageId,
          reply_markup: getBackKeyboard(),
        });
      }

      const link = activeClient.generateLink(inbound, clientConfig, serverHost);
      const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const expiryDate = new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-GB');

      logKeyClaimWithQR(bot, query.from, {
        email, dataGB: gb, expiryDate, ipLimit: 1, link, inbound: inbound.remark || '',
      }, 'Credit Exchange');

      const caption =
        `🔄 <b>Credit Exchange Key ရရှိပါပြီ!</b>\n\n` +
        `📦 Data: <b>${gb} GB</b>\n` +
        `📅 Expiry: <b>${expiryDate}</b>\n` +
        `💰 Used: <b>${cost} Credit</b>\n` +
        `💰 Remaining: <b>${result.balance} Credit</b>\n\n` +
        `🔗 <b>Config Link:</b>\n<code>${escHtml(link)}</code>`;

      try {
        const qrBuffer = await QRCode.toBuffer(link, { width: 300, margin: 2 });
        await bot.deleteMessage(chatId, messageId).catch(() => {});
        await bot.sendPhoto(chatId, qrBuffer, {
          caption, parse_mode: 'HTML', reply_markup: getBackKeyboard(),
        });
      } catch {
        await bot.editMessageText(caption, {
          chat_id: chatId, message_id: messageId,
          parse_mode: 'HTML', reply_markup: getBackKeyboard(),
        });
      }
    } catch (err) {
      return bot.editMessageText(`❌ ${err.message}`, {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(),
      });
    }
    return;
  }

  // ─── Credit History ───────────────────────────────────────
  if (data === 'credit_history') {
    const credits = getUserCredits(userId);
    let text = `📜 <b>Credit History</b>\n\n💰 Balance: <b>${credits.balance}</b>\n\n`;
    const history = (credits.history || []).slice(-10).reverse();
    if (history.length === 0) {
      text += '<i>History မရှိသေးပါ</i>';
    } else {
      for (const h of history) {
        const icon = h.type === 'add' ? '➕' : '➖';
        const date = new Date(h.date).toLocaleDateString('en-GB');
        text += `${icon} ${h.amount} Credit — ${h.reason || 'N/A'} (${date})\n`;
      }
    }
    return bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '« Credit Menu', callback_data: 'credit_menu' }]],
      },
    });
  }

  // ─── Credit Buy (Contact Admin) ────────────────────────────
  if (data === 'credit_purchase') {
    const adminContact = process.env.ADMIN_CONTACT || 'https://t.me/JackFrozt_2k4';
    const balance = getBalance(userId);
    return bot.editMessageText(
      `💵 <b>Credit ဝယ်ယူရန်</b>\n\n` +
      `💰 <b>Current Balance:</b> ${balance} Credit\n\n` +
      `Credit ဝယ်ယူလိုပါက Admin ထံ ဆက်သွယ်ပါ။\n` +
      `ငွေလွှဲပြီးရင် Admin က Credit ထည့်ပေးပါမယ်။`,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📞 Admin ထံ ဆက်သွယ်မယ်', url: adminContact }],
            [{ text: '« Credit Menu', callback_data: 'credit_menu' }],
          ],
        },
      }
    );
  }

  // ─── Coupon Menu ──────────────────────────────────────────
  if (data === 'coupon_menu') {
    const { setCouponRedeemState } = require('./middleware/userLogger');
    setCouponRedeemState(userId);
    return bot.editMessageText(
      `${t(userId, 'coupon_title')}\n\n${t(userId, 'coupon_enter')}`,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: t(userId, 'back'), callback_data: 'back_to_menu' }],
          ],
        },
      }
    );
  }

  // ─── Referral Menu (Credit System) ────────────────────────
  if (data === 'referral_menu') {
    const ref = getUserReferral(userId);
    const config = getReferralConfig();
    const balance = getBalance(userId);
    const botUsername = (await bot.getMe()).username;
    const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;
    const inviteCount = ref.invitedUsers.length;
    const lang = getUserLang(userId);

    const inviteHint = lang === 'en'
      ? `Invite <b>1 friend</b> and earn <b>${config.referralCredit} Credit</b>!`
      : `သူငယ်ချင်း <b>1 ယောက်</b> invite လုပ်ရင် <b>${config.referralCredit} Credit</b> ရမယ်!`;

    let text =
      `${t(userId, 'referral_title')}\n\n` +
      `${inviteHint}\n\n` +
      `${t(userId, 'referral_invited')} ${inviteCount}\n` +
      `${t(userId, 'referral_credit_earned')} ${ref.totalCreditsEarned || 0} Credit\n` +
      `${t(userId, 'credit_your_balance')} ${balance} Credit\n\n` +
      `${t(userId, 'referral_your_link')}\n<code>${refLink}</code>\n\n` +
      `<i>${t(userId, 'referral_earn_hint')}</i>`;

    return bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: t(userId, 'credit'), callback_data: 'credit_menu' }],
          [{ text: t(userId, 'back'), callback_data: 'back_to_menu' }],
        ],
      },
    });
  }

  // ─── Speed Test ───────────────────────────────────────────
  if (data === 'speed_test') {
    const lang = getUserLang(userId);
    bot.editMessageText(lang === 'en' ? '🚀 Running Speed Test...' : '🚀 Speed Test စစ်ဆေးနေပါတယ်...', {
      chat_id: chatId, message_id: messageId,
    });

    try {
      const serverHost = process.env.XUI_SERVER_HOST || '178.128.80.123';
      const startTime = Date.now();
      const axios = require('axios');
      await axios.get(`http://${serverHost}:53253`, { timeout: 5000 }).catch(() => {});
      const ping = Date.now() - startTime;

      const status = ping < 200 ? '🟢 Excellent' : ping < 500 ? '🟡 Good' : '🔴 Slow';

      return bot.editMessageText(
        `🚀 <b>Speed Test Result</b>\n\n` +
        `🌐 <b>Server:</b> ${serverHost}\n` +
        `📡 <b>Ping:</b> ${ping}ms\n` +
        `📊 <b>Status:</b> ${status}\n\n` +
        `<i>Ping = Bot server ကနေ VPN server ဆီ response time</i>`,
        {
          chat_id: chatId, message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Retry', callback_data: 'speed_test' }],
              [{ text: '« Back', callback_data: 'back_to_menu' }],
            ],
          },
        }
      );
    } catch (err) {
      return bot.editMessageText(`❌ Speed test failed: ${err.message}`, {
        chat_id: chatId, message_id: messageId,
        reply_markup: getBackKeyboard(),
      });
    }
  }

  // ─── Language Menu ────────────────────────────────────────
  if (data === 'language_menu') {
    const lang = getUserLang(userId);
    return bot.editMessageText(
      `🌐 <b>Language / ဘာသာစကား</b>\n\n` +
      `Current: <b>${lang === 'mm' ? 'Myanmar 🇲🇲' : 'English 🇺🇸'}</b>\n\n` +
      `ပြောင်းချင်တဲ့ ဘာသာစကား ရွေးပါ:`,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🇲🇲 Myanmar', callback_data: 'lang_mm' },
              { text: '🇺🇸 English', callback_data: 'lang_en' },
            ],
            [{ text: '« Back', callback_data: 'back_to_menu' }],
          ],
        },
      }
    );
  }

  if (data === 'lang_mm' || data === 'lang_en') {
    const lang = data.replace('lang_', '');
    setUserLang(userId, lang);
    const name = lang === 'mm' ? 'Myanmar 🇲🇲' : 'English 🇺🇸';
    return bot.editMessageText(
      `✅ Language changed to <b>${name}</b>`,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: getBackKeyboard(userId),
      }
    );
  }

  // ─── My Key ────────────────────────────────────────────────
  if (data === 'menu_mykey') {
    logUserAction(bot, query.from, '📦 Viewed My Key');
    const trialInfo = getTrialInfo(userId);
    const premiumKeys = getUserPremiumKeys(userId);

    const hasKeys = (trialInfo && trialInfo.keys.length > 0) || premiumKeys.length > 0;

    if (!hasKeys) {
      return bot.editMessageText(
        `${t(userId, 'mykey_title')}\n\n` +
        t(userId, 'mykey_empty'),
        {
          chat_id: chatId, message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: t(userId, 'mykey_get_trial'), callback_data: 'trial_key' }],
              [{ text: t(userId, 'mykey_buy_premium'), callback_data: 'premium_menu' }],
              [{ text: t(userId, 'back'), callback_data: 'back_to_menu' }],
            ],
          },
        }
      );
    }

    let text = `${t(userId, 'mykey_title')}\n\n`;

    // Helper: get client stats from the correct panel
    async function getClientStats(email, panelId) {
      try {
        const c = panelId ? getClient(panelId) : xuiClient;
        if (!c) return null;
        const all = await c.getAllClients();
        return all.find((cl) => cl.email === email) || null;
      } catch { return null; }
    }

    if (trialInfo && trialInfo.keys.length > 0) {
      text += `${t(userId, 'mykey_trial')}\n`;
      for (const key of trialInfo.keys) {
        const client = await getClientStats(key.email, key.panelId);
        if (client) {
          const usedGB = ((client.up + client.down) / 1024 / 1024 / 1024).toFixed(2);
          const totalGB = client.total > 0 ? (client.total / 1024 / 1024 / 1024).toFixed(0) : '∞';
          const expiry = client.expiryTime > 0
            ? new Date(client.expiryTime).toLocaleDateString('en-GB')
            : 'Unlimited';
          const now = Date.now();
          const isExpired = client.expiryTime > 0 && client.expiryTime < now;
          const daysLeft = client.expiryTime > 0 ? Math.max(0, Math.ceil((client.expiryTime - now) / 86400000)) : '∞';
          const status = !client.enable ? '🔴 Disabled' : isExpired ? '🔴 Expired' : '🟢 Active';
          text += `  ${status} | 📊 ${usedGB}/${totalGB} GB | 📅 ${expiry} (${daysLeft}d)\n`;
        }
        text += `  🔗 \`${key.link}\`\n\n`;
      }
    }

    if (premiumKeys.length > 0) {
      text += `${t(userId, 'mykey_premium')}\n`;
      for (const key of premiumKeys) {
        const client = await getClientStats(key.email, key.panelId);
        if (client) {
          const usedGB = ((client.up + client.down) / 1024 / 1024 / 1024).toFixed(2);
          const totalGB = client.total > 0 ? (client.total / 1024 / 1024 / 1024).toFixed(0) : '∞';
          const expiry = client.expiryTime > 0
            ? new Date(client.expiryTime).toLocaleDateString('en-GB')
            : 'Unlimited';
          const now = Date.now();
          const isExpired = client.expiryTime > 0 && client.expiryTime < now;
          const daysLeft = client.expiryTime > 0 ? Math.max(0, Math.ceil((client.expiryTime - now) / 86400000)) : '∞';
          const status = !client.enable ? '🔴 Disabled' : isExpired ? '🔴 Expired' : '🟢 Active';
          text += `  ${status} | ${key.planName || 'Premium'} | 📊 ${usedGB}/${totalGB} GB | 📅 ${expiry} (${daysLeft}d)\n`;
        } else {
          const expiry = key.expiryDate || 'N/A';
          text += `  📦 ${key.planName || 'Premium'} | 📅 ${expiry} | 📊 ${key.dataGB || 0} GB\n`;
        }
        text += `  🔗 \`${key.link}\`\n\n`;
      }
    }

    text += t(userId, 'mykey_copy_hint');

    const allKeys = [];
    if (trialInfo && trialInfo.keys) allKeys.push(...trialInfo.keys);
    allKeys.push(...premiumKeys);
    const qrButtons = allKeys.map((k, i) => ({ text: `📱 QR #${i + 1}`, callback_data: `qr_key_${i}` }));
    const buttons = [];
    if (qrButtons.length > 0) buttons.push(qrButtons.slice(0, 3));
    buttons.push([{ text: t(userId, 'back'), callback_data: 'back_to_menu' }]);

    return bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
  }

  // ─── QR Code for Key ──────────────────────────────────────
  if (data.startsWith('qr_key_')) {
    const idx = parseInt(data.replace('qr_key_', ''));
    const trialInfo2 = getTrialInfo(userId);
    const premiumKeys2 = getUserPremiumKeys(userId);
    const allKeys2 = [];
    if (trialInfo2 && trialInfo2.keys) allKeys2.push(...trialInfo2.keys);
    allKeys2.push(...premiumKeys2);
    const key = allKeys2[idx];
    if (!key) {
      return bot.answerCallbackQuery(query.id, { text: 'Key not found' });
    }
    try {
      const qrBuffer = await QRCode.toBuffer(key.link, { width: 300, margin: 2 });
      await bot.sendPhoto(chatId, qrBuffer, {
        caption: `📱 <b>QR Code</b>\n\n<code>${key.link.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code>`,
        parse_mode: 'HTML',
      });
    } catch {
      bot.sendMessage(chatId, '❌ QR Code generate မရပါ');
    }
    return;
  }

  // ─── My Account ────────────────────────────────────────────
  if (data === 'my_account') {
    const user = getUser(userId);
    const trialInfo = getTrialInfo(userId);
    const hasTrial = trialInfo && trialInfo.count > 0;
    const premiumKeys = getUserPremiumKeys(userId);
    const ref = getUserReferral(userId);
    const balance = getBalance(userId);

    const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const userName = escHtml(query.from.first_name || 'User');
    const username = query.from.username ? `@${escHtml(query.from.username)}` : 'N/A';

    let text =
      `${t(userId, 'account_title')}\n\n` +
      `${t(userId, 'account_name')} ${userName}\n` +
      `${t(userId, 'account_username')} ${username}\n` +
      `${t(userId, 'account_id')} <code>${userId}</code>\n` +
      `${t(userId, 'account_joined')} ${user ? new Date(user.joinedAt).toLocaleDateString('en-GB') : 'N/A'}\n\n`;

    if (hasTrial) {
      text += `🎁 <b>Trial Key:</b> ယူပြီး (${trialInfo.count}/${getTrialConfig().maxTrials})\n`;
    } else {
      text += `🎁 <b>Trial Key:</b> မယူရသေးပါ\n`;
    }
    text += `💎 <b>Premium Keys:</b> ${premiumKeys.length} ခု\n`;
    text += `👥 <b>Referrals:</b> ${ref.invitedUsers.length} ယောက် invited\n\n`;

    const creditInfo = getUserCredits(userId);
    const settings = getCreditSettings();
    text += `💰 <b>Credit Info:</b>\n`;
    text += `   Balance: <b>${balance}</b> Credit\n`;
    text += `   Referral Earned: ${ref.totalCreditsEarned || 0} Credit\n`;
    text += `   Total Spent: ${creditInfo.history.filter(h => h.type === 'deduct').reduce((a, h) => a + h.amount, 0).toFixed(2)} Credit\n`;
    text += `   Rate: ${settings.creditPerGB} Credit = 1 GB\n`;

    const allKeys = [];
    if (trialInfo && trialInfo.keys) allKeys.push(...trialInfo.keys);
    allKeys.push(...premiumKeys);

    if (allKeys.length > 0) {
      try {
        const clients = await xuiClient.getAllClients();
        const lastKey = allKeys[allKeys.length - 1];
        const client = clients.find((c) => c.email === lastKey.email);

        if (client) {
          const usedGB = ((client.up + client.down) / 1024 / 1024 / 1024).toFixed(2);
          const totalGB = client.total > 0 ? (client.total / 1024 / 1024 / 1024).toFixed(0) : 'Unlimited';
          const expiry = client.expiryTime > 0
            ? new Date(client.expiryTime).toLocaleDateString('en-GB')
            : 'Unlimited';
          const now = Date.now();
          const isExpired = client.expiryTime > 0 && client.expiryTime < now;
          const daysLeft = client.expiryTime > 0
            ? Math.max(0, Math.ceil((client.expiryTime - now) / (1000 * 60 * 60 * 24)))
            : '∞';
          const status = !client.enable ? '🔴 Disabled' : isExpired ? '🔴 Expired' : '🟢 Active';

          text +=
            `\n📊 <b>Latest Key:</b> ${status}\n` +
            `📅 <b>Expiry:</b> ${expiry} (${daysLeft} days left)\n` +
            `📦 <b>Data Used:</b> ${usedGB} GB / ${totalGB} GB\n`;
        }
      } catch {
        text += `\n<i>Usage data ယူ၍မရပါ</i>\n`;
      }
    }

    return bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: getBackKeyboard(userId),
    });
  }

  // ─── Rating Menu ──────────────────────────────────────────
  if (data === 'rating_menu') {
    const fs = require('fs');
    const ratingsFile = './data/ratings.json';
    let ratings = {};
    try { ratings = JSON.parse(fs.readFileSync(ratingsFile, 'utf8')); } catch {}

    const myRating = ratings[userId];
    let text = `${t(userId, 'rating_title')}\n\n`;
    if (myRating) {
      text += `${'⭐'.repeat(myRating.stars)} (${myRating.stars}/5)\n`;
      if (myRating.feedback) text += `💬 "${myRating.feedback}"\n`;
      text += `\n${t(userId, 'rating_prompt')}`;
    } else {
      text += `${t(userId, 'rating_prompt')}`;
    }

    return bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⭐', callback_data: 'rate_1' },
            { text: '⭐⭐', callback_data: 'rate_2' },
            { text: '⭐⭐⭐', callback_data: 'rate_3' },
          ],
          [
            { text: '⭐⭐⭐⭐', callback_data: 'rate_4' },
            { text: '⭐⭐⭐⭐⭐', callback_data: 'rate_5' },
          ],
          [{ text: t(userId, 'back'), callback_data: 'back_to_menu' }],
        ],
      },
    });
  }

  if (data.startsWith('rate_')) {
    const stars = parseInt(data.replace('rate_', ''));
    const fs = require('fs');
    const ratingsFile = './data/ratings.json';
    let ratings = {};
    try { ratings = JSON.parse(fs.readFileSync(ratingsFile, 'utf8')); } catch {}

    ratings[userId] = {
      stars,
      date: new Date().toISOString(),
      name: [query.from.first_name, query.from.last_name].filter(Boolean).join(' '),
      username: query.from.username || '',
    };
    fs.writeFileSync(ratingsFile, JSON.stringify(ratings, null, 2));

    logUserAction(bot, query.from, '⭐ Rating', `${stars}/5 stars`);

    const text =
      `${t(userId, 'rating_thanks')}\n\n` +
      `${'⭐'.repeat(stars)} (${stars}/5)\n\n` +
      `${t(userId, 'rating_feedback')}`;

    return bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💬 Feedback', callback_data: 'rate_feedback' }],
          [{ text: t(userId, 'back'), callback_data: 'back_to_menu' }],
        ],
      },
    });
  }

  if (data === 'rate_feedback') {
    const { setRatingFeedbackState } = require('./middleware/userLogger');
    setRatingFeedbackState(userId);
    return bot.editMessageText(
      `💬 <b>Feedback</b>\n\n${t(userId, 'rating_feedback')}`,
      {
        chat_id: chatId, message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: t(userId, 'coupon_cancel'), callback_data: 'rating_menu' }],
          ],
        },
      }
    );
  }

  // ─── Contact Admin ─────────────────────────────────────────
  if (data === 'contact_admin') {
    const adminContact = process.env.ADMIN_CONTACT || 'https://t.me/JackFrozt_2k4';
    const lang = getUserLang(userId);

    const text = lang === 'en'
      ? `📞 *Contact Admin*\n\nFor any help, contact Admin.\n\n` +
        `*You can contact for:*\n` +
        `• Key extension\n• Buy Premium key\n• Buy Credit\n• Connection issues\n• Other help`
      : `📞 *Admin ဆက်သွယ်ရန်*\n\n` +
        `အကူအညီလိုအပ်ပါက Admin ထံ ဆက်သွယ်ပါ။\n\n` +
        `*ဆက်သွယ်နိုင်တဲ့ အကြောင်းအရာများ:*\n` +
        `• Key သက်တမ်းတိုးခြင်း\n• Premium key ဝယ်ယူခြင်း\n• Credit ဝယ်ယူခြင်း\n• ချိတ်ဆက်မှု ပြဿနာများ\n• အခြား အကူအညီများ`;

    const contactBtn = lang === 'en' ? '📞 Contact Admin' : '📞 Admin ထံ ဆက်သွယ်မယ်';

    return bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: contactBtn, url: adminContact }],
          [{ text: t(userId, 'back'), callback_data: 'back_to_menu' }],
        ],
      },
    });
  }
}

module.exports = { handleCallback };
