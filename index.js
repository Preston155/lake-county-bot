require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  Partials
} = require("discord.js");
const fs = require("fs");
const path = require("path");

/* ================= CLIENT ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel]
});


/* ================= CONFIG ================= */
const STAFF_ROLE_ID = "1282417060391161978";
const PURGE_ROLE_ID = "1272545462657880118";
const MEMBER_ROLE_ID = "1271544180539134052";
const LOCKDOWN_ROLE_ID = "1468052115242094787";
const ANNOUNCEMENT_ROLE_ID = "1310976402430103562";

const TICKET_CATEGORY_ID = "1461009005798359204";
const TICKET_LOG_CHANNEL_ID = "1461010272444747867";
const LOCKDOWN_LOG_CHANNEL_ID = "1461008751749234740";

const WELCOME_CHANNEL_ID = "1460994169697730560";
const LEAVE_CHANNEL_ID = "1460994659848421377";
const BOOST_CHANNEL_ID = "1467596304900292869";
const SSU_PING_ROLE_ID = "1310976402430103562";


/* ================= STORAGE ================= */
const DATA_FILE = path.join(__dirname, "data.json");
const warnings = {};
const giveaways = {};
const sessionPolls = new Map();

let countingChannelId = null;
let currentCount = 0;
let lastCounterId = null;
let lastSessionPollMessageId = null;

/* ================= DATA ================= */
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  countingChannelId = data.counting?.channelId ?? null;
  currentCount = data.counting?.currentCount ?? 0;
  lastCounterId = data.counting?.lastCounterId ?? null;
  Object.assign(warnings, data.warnings ?? {});
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    counting: { channelId: countingChannelId, currentCount, lastCounterId },
    warnings
  }, null, 2));
}

const SELF_ROLE_CONFIG = {
  announce: {
    label: "📣 Announcement Notification",
    roleId: "1468272674928328818"
  },
  session: {
    label: "🎮 Session Notification",
    roleId: "1468213717035384882"
  },
  giveaway: {
    label: "🎉 Giveaway Notification",
    roleId: "1468272960472354960"
  },
  chat: {
    label: "💬 Active Chat Notification",
    roleId: "1468273029980356812"
  }
};

/* ================= READY ================= */
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  setImmediate(() => {
    try {
      loadData();
      console.log("📦 Data loaded");
    } catch (e) {
      console.error("Data load failed:", e);
    }
  });
});

/* ================= TICKET CONFIG ================= */
const TICKET_PANEL_CHANNEL_ID = "PUT_PANEL_CHANNEL_ID_HERE";
const TICKET_LOG_CHANNEL_ID = "PUT_LOG_CHANNEL_ID_HERE";
const STAFF_ROLE_ID = "1282417060391161978";

const TICKET_CATEGORIES = {
  general: {
    label: "👥 General Support",
    description: "General inquiries, concerns, reports",
    categoryId: "1468276842942435338",
    emoji: "👥"
  },
  partnership: {
    label: "🤝 Partnership Support",
    description: "Partnership & staff partnership requests",
    categoryId: "1461009005798359204",
    emoji: "🤝"
  },
  internal: {
    label: "🛡️ Internal Affairs",
    description: "Staff reports, appeals, role requests",
    categoryId: "1468276930796327125",
    emoji: "🛡️"
  },
  management: {
    label: "🛠️ Management Support",
    description: "Store purchases, high-rank inquiries",
    categoryId: "1468277029865783489",
    emoji: "🛠️"
  }
};

/* ================= WELCOME ================= */
client.on("guildMemberAdd", member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("👋 Welcome to Lake County Roleplay!")
    .setDescription(
      `Welcome ${member}!\n\n` +
      "We’re excited to have you here at **Lake County Roleplay** 💙\n\n" +
      "**Get started:**\n" +
      "📜 Read the server rules\n" +
      "🎭 Set up your roles\n" +
      "🚓 Enjoy realistic roleplay\n\n" +
      "**Need help?** Open a support ticket anytime!"
    )
    .setColor(0x2ECC71)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setImage(
      "https://media.discordapp.net/attachments/1442342822299566174/1466612239116013791/West_Virginia_Roleplay_5.png?width=1037&height=276"
    )
    .setTimestamp();

  channel.send({
    content: `${member}`,
    embeds: [embed]
  });
});

/* ================= LEAVE ================= */
client.on("guildMemberRemove", member => {
  const channel = member.guild.channels.cache.get(LEAVE_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("💔 Member Left")
    .setDescription(
      `${member.user.tag} has left the server.\n\n` +
      "We hope to see you again someday 💙"
    )
    .setColor(0xE74C3C)
    .setTimestamp();

  channel.send({ embeds: [embed] });
});

/* ================= MESSAGE HANDLER ================= */
client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  if (message.content !== "!ticketpanel") return;

  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return message.reply("❌ Admins only.");

  const embed = new EmbedBuilder()
    .setTitle("🎫 LAKE COUNTY ROLEPLAY — ASSISTANCE")
    .setDescription(
      "**Welcome to the Assistance Dashboard**\n\n" +
      "Select the type of support you need below.\n" +
      "False tickets may result in punishment.\n\n" +
      "**Support Options:**\n" +
      "• 👥 General Support\n" +
      "• 🤝 Partnership Support\n" +
      "• 🛡️ Internal Affairs\n" +
      "• 🛠️ Management Support\n\n" +
      "_Please do not ping staff._"
    )
    .setColor(0x00BFFF)
    .setImage("https://media.discordapp.net/attachments/1442342822299566174/1466612239116013791/West_Virginia_Roleplay_5.png")
    .setFooter({ text: "Lake County Roleplay Support" });

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("Request Assistance...")
      .addOptions(
        {
          label: "👥 General Support",
          description: "General inquiries, concerns, reports",
          value: "general"
        },
        {
          label: "🤝 Partnership Support",
          description: "Partnership & staff partnership requests",
          value: "partnership"
        },
        {
          label: "🛡️ Internal Affairs",
          description: "Staff reports & appeals",
          value: "internal"
        },
        {
          label: "🛠️ Management Support",
          description: "Store purchases & high-rank inquiries",
          value: "management"
        }
      )
  );

  await message.channel.send({ embeds: [embed], components: [menu] });
});

  /* ⚠️ WARN USER */
if (message.content.startsWith("!warn")) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
    return message.reply("❌ Staff only.");

  const args = message.content.split(" ");
  const user =
    message.mentions.users.first() ||
    message.guild.members.cache.get(args[1])?.user;

  const reason = args.slice(2).join(" ");

  if (!user || !reason)
    return message.reply("Usage: `!warn @user reason`");

  warnings[user.id] ??= [];
  warnings[user.id].push({
    reason,
    staff: message.author.tag,
    date: new Date().toLocaleString()
  });

  saveData();

  message.channel.send(
    `⚠️ **${user.tag} has been warned**\n` +
    `📄 Reason: ${reason}\n` +
    `📊 Total warnings: **${warnings[user.id].length}**`
  );
}

if (cmd === "!rolesetup") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return message.reply("❌ Admins only.");

  const embed = new EmbedBuilder()
    .setTitle("📢 LAKE COUNTY ROLEPLAY — NOTIFICATIONS")
    .setDescription(
      "Select a role below to get notified whenever something happens.\n" +
      "You can manage the pings you receive for sessions and announcements at any time.\n\n" +
      "**Available Notifications:**\n" +
      "• 📣 Announcement Notification\n" +
      "• 🎮 Session Notification\n" +
      "• 🎉 Giveaway Notification\n" +
      "• 💬 Active Chat Notification\n\n" +
      "_You will be roled instantly after clicking one of the buttons below._"
    )
    .setColor(0x00BFFF)
    .setImage(
      "https://media.discordapp.net/attachments/1442342822299566174/1466612239116013791/West_Virginia_Roleplay_5.png"
    )
    .setFooter({ text: "Lake County Roleplay" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("role_announce").setEmoji("📣").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("role_session").setEmoji("🎮").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("role_giveaway").setEmoji("🎉").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("role_chat").setEmoji("💬").setStyle(ButtonStyle.Secondary)
  );

  return message.channel.send({ embeds: [embed], components: [row] });
}

/* 📋 VIEW WARNINGS */
if (message.content.startsWith("!warnings")) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
    return message.reply("❌ Staff only.");

  const args = message.content.split(" ");
  const user =
    message.mentions.users.first() ||
    message.guild.members.cache.get(args[1])?.user;

  if (!user)
    return message.reply("Usage: `!warnings @user`");

  const list = warnings[user.id] || [];
  if (!list.length)
    return message.reply("✅ This user has no warnings.");

  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Warnings for ${user.tag}`)
    .setDescription(
      list.map((w, i) =>
        `**${i + 1}.** ${w.reason}\n👮 ${w.staff} — ${w.date}`
      ).join("\n\n")
    )
    .setColor(0xF1C40F);

  message.channel.send({ embeds: [embed] });
}

/* 🧹 CLEAR WARNINGS */
if (message.content.startsWith("!clearwarnings")) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
    return message.reply("❌ Staff only.");

  const args = message.content.split(" ");
  const user =
    message.mentions.users.first() ||
    message.guild.members.cache.get(args[1])?.user;

  if (!user)
    return message.reply("Usage: `!clearwarnings @user`");

  if (!warnings[user.id] || !warnings[user.id].length)
    return message.reply("✅ This user has no warnings.");

  warnings[user.id] = [];
  saveData();

  message.channel.send(`🧹 All warnings cleared for **${user.tag}**.`);
}

/* 👤 MY WARNINGS */
if (message.content === "!mywarns") {
  const list = warnings[message.author.id] || [];
  if (!list.length)
    return message.reply("✅ You have no warnings.");

  const embed = new EmbedBuilder()
    .setTitle("⚠️ Your Warnings")
    .setDescription(
      list.map((w, i) =>
        `**${i + 1}.** ${w.reason}\n📅 ${w.date}`
      ).join("\n\n")
    )
    .setColor(0x3498DB);

  message.reply({ embeds: [embed] });
}

/* 🧪 TEST WELCOME */
if (message.content === "!testwelcome") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return message.reply("❌ Admins only.");

  client.emit("guildMemberAdd", message.member);
}

/* 🧪 TEST LEAVE */
if (message.content === "!testleave") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return message.reply("❌ Admins only.");

  client.emit("guildMemberRemove", message.member);
}

/* 🧪 TEST BOOST */
if (message.content === "!testboost") {
  if (!message.member.roles.cache.has(ANNOUNCEMENT_ROLE_ID))
    return message.reply("❌ You are not authorized.");

  const channel = message.guild.channels.cache.get(BOOST_CHANNEL_ID);
  if (!channel) return message.reply("❌ Boost channel not found.");

  const embed = new EmbedBuilder()
    .setTitle("💜 Server Boosted!")
    .setDescription(
      `🚀 **Thank you ${message.author}!**\n\n` +
      "Your boost helps **Lake County Roleplay** grow and unlock awesome perks for everyone!\n\n" +
      "We truly appreciate your support 💙"
    )
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setColor(0xF47FFF)
    .setFooter({ text: "Lake County Roleplay" })
    .setTimestamp();

  channel.send({
    content: `💜 ${message.author} just boosted the server! *(TEST MESSAGE)*`,
    embeds: [embed]
  });
}

/* 💜 SERVER BOOST DETECTION */
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  // Detect NEW boost only
  if (!oldMember.premiumSince && newMember.premiumSince) {
    const channel = newMember.guild.channels.cache.get(BOOST_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle("💜 Server Boosted!")
      .setDescription(
        `🚀 **Thank you ${newMember}!**\n\n` +
        "Your boost helps **Lake County Roleplay** grow and unlock awesome perks for everyone!\n\n" +
        "We truly appreciate your support 💙"
      )
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
      .setColor(0xF47FFF)
      .setFooter({ text: "Lake County Roleplay" })
      .setTimestamp();

    channel.send({
      content: `💜 ${newMember} just boosted the server!`,
      embeds: [embed]
    });
  }
});

/* 🚨 SERVER LOCKDOWN */
if (message.content.startsWith("!lockdown")) {
  if (!message.member.roles.cache.has(LOCKDOWN_ROLE_ID))
    return message.reply("❌ You are not authorized to use this command.");

  const reason =
    message.content.split(" ").slice(1).join(" ") || "No reason provided";

  const embed = new EmbedBuilder()
    .setTitle("🚨 SERVER LOCKDOWN ACTIVATED")
    .setDescription(
      `🔒 **All text channels have been locked.**\n\n` +
      `👮 **By:** ${message.author}\n` +
      `📝 **Reason:** ${reason}`
    )
    .setColor(0xE74C3C)
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
  message.guild.channels.cache
    .get(LOCKDOWN_LOG_CHANNEL_ID)
    ?.send({ embeds: [embed] });

  const textChannels = message.guild.channels.cache.filter(
    c => c.type === ChannelType.GuildText
  );

  for (const channel of textChannels.values()) {
    await channel.permissionOverwrites
      .edit(message.guild.id, { SendMessages: false })
      .catch(() => {});
    await channel.permissionOverwrites
      .edit(MEMBER_ROLE_ID, { SendMessages: false })
      .catch(() => {});
  }
}

/* 🔓 SERVER UNLOCKDOWN */
if (message.content === "!unlockdown") {
  if (!message.member.roles.cache.has(LOCKDOWN_ROLE_ID))
    return message.reply("❌ You are not authorized to use this command.");

  const embed = new EmbedBuilder()
    .setTitle("✅ SERVER LOCKDOWN LIFTED")
    .setDescription(`👮 **By:** ${message.author}`)
    .setColor(0x2ECC71)
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
  message.guild.channels.cache
    .get(LOCKDOWN_LOG_CHANNEL_ID)
    ?.send({ embeds: [embed] });

  const textChannels = message.guild.channels.cache.filter(
    c => c.type === ChannelType.GuildText
  );

  for (const channel of textChannels.values()) {
    await channel.permissionOverwrites
      .edit(message.guild.id, { SendMessages: null })
      .catch(() => {});
    await channel.permissionOverwrites
      .edit(MEMBER_ROLE_ID, { SendMessages: null })
      .catch(() => {});
  }
}

/* 🎉 GIVEAWAY */
if (message.content.startsWith("!giveaway")) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild))
    return message.reply("❌ You need **Manage Server** permission.");

  const args = message.content.split(" ");
  const duration = parseTime(args[1]);
  const winnersCount = parseInt(args[2]);
  const prize = args.slice(3).join(" ");

  if (!duration || !winnersCount || !prize)
    return message.reply(
      "Usage: `!giveaway <time> <winners> <prize>`\n" +
      "Example: `!giveaway 10m 1 Nitro`"
    );

  const endTime = Date.now() + duration;

  const embed = new EmbedBuilder()
    .setTitle("🎉 GIVEAWAY 🎉")
    .setDescription(
      `🎁 **Prize:** ${prize}\n` +
      `👑 **Winners:** ${winnersCount}\n` +
      `⏰ **Ends:** <t:${Math.floor(endTime / 1000)}:R>\n\n` +
      `React with 🎉 to enter!`
    )
    .setColor(0xF1C40F)
    .setFooter({ text: `Hosted by ${message.author.tag}` });

  const giveawayMessage = await message.channel.send({ embeds: [embed] });
  await giveawayMessage.react("🎉");

  giveaways[giveawayMessage.id] = {
    channelId: message.channel.id,
    prize,
    winnersCount,
    endTime
  };

  saveData();

  setTimeout(async () => {
    const channel = await message.guild.channels.fetch(message.channel.id);
    const msg = await channel.messages.fetch(giveawayMessage.id);
    const reaction = msg.reactions.cache.get("🎉");

    if (!reaction) return channel.send("❌ No valid entries.");

    const users = await reaction.users.fetch();
    const entries = users.filter(u => !u.bot).map(u => u.id);

    if (entries.length < winnersCount)
      return channel.send("❌ Not enough entries.");

    const winners = [];
    while (winners.length < winnersCount) {
      const id = entries[Math.floor(Math.random() * entries.length)];
      if (!winners.includes(id)) winners.push(id);
    }

    channel.send(
      `🎉 **GIVEAWAY ENDED!** 🎉\n` +
      `🎁 **Prize:** ${prize}\n` +
      `🏆 **Winner(s):** ${winners.map(id => `<@${id}>`).join(", ")}`
    );
  }, duration);
}

  /* 🔢 SET COUNTING */
  if (message.content === "!setcounting") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only.");

    countingChannelId = message.channel.id;
    currentCount = 0;
    lastCounterId = null;
    saveData();
    return message.channel.send("🔢 Counting channel set. Start at **1**.");
  }

  /* 🔢 COUNTING */
  if (message.channel.id === countingChannelId) {
    const num = parseInt(message.content);
    if (isNaN(num)) return message.delete().catch(() => {});

    if (num !== currentCount + 1 || message.author.id === lastCounterId) {
      currentCount = 0;
      lastCounterId = null;
      saveData();
      return message.channel.send("❌ Wrong number. Reset to **0**.");
    }

    currentCount = num;
    lastCounterId = message.author.id;
    saveData();
    return message.react("✅");
  }

  /* 📊 SESSION POLL */
  if (message.content === "!ssuvote") {
    if (!message.member.roles.cache.has(ANNOUNCEMENT_ROLE_ID))
      return message.reply("❌ Unauthorized.");

    const embed = new EmbedBuilder()
      .setTitle("📊 Session Poll")
      .setDescription(
        "**Session Poll!**\n\n" +
        "Click below if you can attend.\n\n" +
        "**🟢 5+ votes needed**"
      )
      .setImage("https://media.discordapp.net/attachments/1452829338545160285/1466919030127591613/ILLEGAL_FIREARM_1.png")
      .setColor(0x00BFFF);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("sessionpoll_vote")
        .setLabel("✅ Attend (0/5)")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("sessionpoll_view")
        .setLabel("👀 View Votes")
        .setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.channel.send({
      content: "@everyone",
      embeds: [embed],
      components: [row],
      allowedMentions: { parse: ["everyone"] }
    });

    sessionPolls.set(msg.id, new Set());
    lastSessionPollMessageId = msg.id;
  }

/* 🚨 SERVER STARTUP */
if (message.content === "!ssu") {
  if (!message.member.roles.cache.has(ANNOUNCEMENT_ROLE_ID))
    return message.reply("❌ You are not authorized to use this command.");

  if (!lastSessionPollMessageId || !sessionPolls.has(lastSessionPollMessageId)) {
    return message.reply("❌ No active session poll found.");
  }

  const voters = sessionPolls.get(lastSessionPollMessageId);

  if (!voters.size) {
    return message.reply("❌ No one voted in the session poll.");
  }

  // Build mentions
  const userMentions = [...voters].map(id => `<@${id}>`).join(" ");
  const roleMention = `<@&${SSU_PING_ROLE_ID}>`;

  const embed = new EmbedBuilder()
    .setTitle("🚨 Server Startup!")
    .setDescription(
      "**Server Startup!**\n" +
      "*A game session has begun. To join, just read the details provided below.*\n\n" +
      "**Server Information:**\n" +
      "Game Code: **ILCRPC**\n" +
      "Server Owner: **MiningMavenYT**\n\n" +
      "*Those who reacted must join*"
    )
    .setImage("https://media.discordapp.net/attachments/1452829338545160285/1466919030127591613/ILLEGAL_FIREARM_1.png")
    .setColor(0x2ECC71)
    .setFooter({ text: "Lake County Roleplay" })
    .setTimestamp();

  await message.channel.send({
    content: `${roleMention}\n${userMentions}`,
    embeds: [embed],
    allowedMentions: {
      roles: [SSU_PING_ROLE_ID],
      users: [...voters]
    }
  });
}


  /* 🔻 SSD */
  if (message.content === "!ssd") {
    if (!message.member.roles.cache.has(ANNOUNCEMENT_ROLE_ID))
      return message.reply("❌ Unauthorized.");

    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔻 Server Shutdown")
          .setDescription("Server is temporarily offline.")
          .setColor(0xE74C3C)
      ]
    });
  }

  /* 🧹 PURGE */
  if (message.content.startsWith("!purge")) {
    if (!message.member.roles.cache.has(PURGE_ROLE_ID))
      return message.reply("❌ No permission.");

    const amt = parseInt(message.content.split(" ")[1]);
    if (!amt || amt < 1 || amt > 100)
      return message.reply("Usage: `!purge 1-100`");

    await message.delete();
    await message.channel.bulkDelete(amt, true);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "ticket_select") return;

  const type = interaction.values[0];
  const config = TICKET_CATEGORIES[type];
  if (!config) return;

  const existing = interaction.guild.channels.cache.find(
    c => c.topic === `ticket:${interaction.user.id}`
  );
  if (existing)
    return interaction.reply({
      content: "⚠️ You already have an open ticket.",
      ephemeral: true
    });

  const channel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`.toLowerCase(),
    type: ChannelType.GuildText,
    parent: config.categoryId,
    topic: `ticket:${interaction.user.id}`,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle(`${config.emoji} ${config.label}`)
    .setDescription(
      `Hello ${interaction.user},\n\n` +
      "Please explain your issue clearly.\n" +
      "A staff member will assist you shortly.\n\n" +
      "**Rules:**\n• One issue per ticket\n• No staff pings"
    )
    .setColor(0x2ECC71);

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("🔒 Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `<@&${STAFF_ROLE_ID}> ${interaction.user}`,
    embeds: [embed],
    components: [buttons]
  });

  interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL_ID)?.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🎫 Ticket Created")
        .setDescription(`${interaction.user} → ${channel}`)
        .setColor(0x00BFFF)
        .setTimestamp()
    ]
  });

  interaction.reply({
    content: `✅ Ticket created: ${channel}`,
    ephemeral: true
  });

  client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "ticket_close") return;

  await interaction.reply("🔒 Closing ticket in 3 seconds...");
  setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
});

/* ================= BUTTON HANDLER ================= */
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const voters = sessionPolls.get(interaction.message.id);
  if (!voters) return;

  if (interaction.customId === "sessionpoll_vote") {
    if (voters.has(interaction.user.id))
      return interaction.reply({ content: "❌ Already voted.", ephemeral: true });

    voters.add(interaction.user.id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("sessionpoll_vote")
        .setLabel(`✅ Attend (${voters.size}/5)`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(voters.size >= 5),
      new ButtonBuilder()
        .setCustomId("sessionpoll_view")
        .setLabel("👀 View Votes")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.update({ components: [row] });
  }

  if (interaction.customId === "sessionpoll_view") {
    return interaction.reply({
      content: `**Voters:**\n${[...voters].map(id => `<@${id}>`).join("\n")}`,
      ephemeral: true
    });
  }
});

/* ================= SAFE SHUTDOWN ================= */
process.on("SIGINT", () => { saveData(); process.exit(); });
process.on("SIGTERM", () => { saveData(); process.exit(); });

client.login(process.env.TOKEN);
