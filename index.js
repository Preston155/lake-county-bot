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
  Partials
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* ================= CLIENT ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

/* ================= CONFIG ================= */
const STAFF_ROLE_ID = "1282417060391161978";
const PURGE_ROLE_ID = "1272545462657880118";
const MEMBER_ROLE_ID = "1271544180539134052";
const LOCKDOWN_ROLE_ID = "1468052115242094787";

const TICKET_CATEGORY_ID = "1461009005798359204";
const TICKET_LOG_CHANNEL_ID = "1461010272444747867";
const LOCKDOWN_LOG_CHANNEL_ID = "1461008751749234740";

const WELCOME_CHANNEL_ID = "1460994169697730560";
const LEAVE_CHANNEL_ID = "1460994659848421377";
const ANNOUNCEMENT_ROLE_ID = "1310976402430103562";
const BOOST_CHANNEL_ID = "1467596304900292869";


/* ================= COUNTING ================= */
let countingChannelId = null;
let currentCount = 0;
let lastCounterId = null;

/* ================= WARNINGS ================= */
const warnings = {};

function getTargetUser(message, argIndex = 1) {
  const mentioned = message.mentions.users.first();
  if (mentioned) return mentioned;

  const args = message.content.split(" ");
  const id = args[argIndex];
  if (!id) return null;

  return message.client.users.cache.get(id) || { id };
}

/* ================= DATA STORAGE ================= */
const DATA_FILE = path.join(__dirname, "data.json");

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  countingChannelId = data.counting?.channelId ?? null;
  currentCount = data.counting?.currentCount ?? 0;
  lastCounterId = data.counting?.lastCounterId ?? null;

  Object.assign(warnings, data.warnings ?? {});
  Object.assign(giveaways, data.giveaways ?? {});
}


function saveData() {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(
      {
        counting: {
          channelId: countingChannelId,
          currentCount,
          lastCounterId
        },
        warnings,
        giveaways
      },
      null,
      2
    )
  );
}

/* ================= READY ================= */
client.once("ready", () => {
  loadData();
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ================= GIVEAWAYS ================= */
const giveaways = {};

/* ================= WELCOME ================= */
client.on("guildMemberAdd", (member) => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("👋 Welcome to Lake County Roleplay!")
    .setDescription(
      `Welcome ${member}!\n\n` +
      "We’re excited to have you here at **Lake County Roleplay** 💙\n\n" +
      "**Get started:**\n" +
      "• Read the server rules 📜\n" +
      "• Set up your roles 🎭\n" +
      "• Enjoy realistic roleplay 🚓🚑\n\n" +
      "Need help? Open a support ticket anytime!"
    )
    .setImage("https://media.discordapp.net/attachments/1442342822299566174/1466612239116013791/West_Virginia_Roleplay_5.png")
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setColor(0x2ECC71)
    .setTimestamp();

  channel.send({ content: `${member}`, embeds: [embed] });
});

/* ================= LEAVE ================= */
client.on("guildMemberRemove", (member) => {
  const channel = member.guild.channels.cache.get(LEAVE_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("💔 A Member Has Left")
    .setDescription(
      `**${member.user.tag}** has left **Lake County Roleplay**.\n\n` +
      "It’s always sad to see someone go 😔\n\n" +
      "We hope everything is okay and that they find their way back someday."
    )
    .setColor(0xE74C3C)
    .setTimestamp();

  channel.send({ embeds: [embed] });
});

function parseTime(time) {
  const match = time.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60000;
    case "h": return value * 3600000;
    case "d": return value * 86400000;
    default: return null;
  }
}

/* 💜 SERVER BOOST DETECTION */
client.on("guildMemberUpdate", (oldMember, newMember) => {
  // Detect new boost
  if (!oldMember.premiumSince && newMember.premiumSince) {
    const channel = newMember.guild.channels.cache.get(BOOST_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle("💜 Server Boosted!")
      .setDescription(
        `🚀 **Thank you ${newMember}!**\n\n` +
        "Your server boost helps **Lake County Roleplay** grow and unlock awesome perks for everyone!\n\n" +
        "We truly appreciate your support 💙"
      )
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
      .setColor(0xF47FFF) // boost pink
      .setTimestamp();

    channel.send({
      content: `💜 ${newMember} just boosted the server!`,
      embeds: [embed]
    });
  }
});

/* ================= MESSAGE HANDLER ================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  /* 🚨 LOCKDOWN */
  if (message.content.startsWith("!lockdown")) {
    if (!message.member.roles.cache.has(LOCKDOWN_ROLE_ID))
      return message.reply("❌ You are not authorized to use this command.");

    const reason = message.content.split(" ").slice(1).join(" ") || "No reason provided";

    const embed = new EmbedBuilder()
      .setTitle("🚨 SERVER LOCKDOWN ACTIVATED")
      .setDescription(
        `🔒 **All members have been muted in text channels.**\n\n` +
        `👮 **By:** ${message.author}\n` +
        `📝 **Reason:** ${reason}`
      )
      .setColor(0xE74C3C)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
    message.guild.channels.cache.get(LOCKDOWN_LOG_CHANNEL_ID)?.send({ embeds: [embed] });

    const channels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
    const promises = [];

    for (const channel of channels.values()) {
      promises.push(channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false }).catch(() => {}));
      promises.push(channel.permissionOverwrites.edit(MEMBER_ROLE_ID, { SendMessages: false }).catch(() => {}));
    }

    await Promise.all(promises);
  }

  /* 🔓 UNLOCKDOWN */
  if (message.content === "!unlockdown") {
    if (!message.member.roles.cache.has(LOCKDOWN_ROLE_ID))
      return message.reply("❌ You are not authorized to use this command.");

    const embed = new EmbedBuilder()
      .setTitle("✅ SERVER LOCKDOWN LIFTED")
      .setDescription(`👮 **By:** ${message.author}`)
      .setColor(0x2ECC71)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
    message.guild.channels.cache.get(LOCKDOWN_LOG_CHANNEL_ID)?.send({ embeds: [embed] });

    const channels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
    const promises = [];

    for (const channel of channels.values()) {
      promises.push(channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null }).catch(() => {}));
      promises.push(channel.permissionOverwrites.edit(MEMBER_ROLE_ID, { SendMessages: null }).catch(() => {}));
    }

    await Promise.all(promises);
  }

  /* 🧪 TEST BOOST MESSAGE */
if (message.content === "!testboost") {
  if (!message.member.roles.cache.has(ANNOUNCEMENT_ROLE_ID))
    return message.reply("❌ You are not authorized to use this command.");

  const channel = message.guild.channels.cache.get("1467596304900292869");
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

/* 🤖 BOT INFO */
if (message.content === "!botinfo") {
  const now = Date.now();
  const readyAt = client.readyAt?.getTime() ?? now;
  const diff = now - readyAt;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  const embed = new EmbedBuilder()
    .setTitle("🤖 Bot Information")
    .setDescription(
      "**Bot Name:** Lake County RP Bot\n" +
      `**Developer:** ${message.author.tag}\n\n` +

      "**📊 Stats:**\n" +
      `Servers: **${client.guilds.cache.size}**\n` +
      `Users: **${client.users.cache.size}**\n` +
      `Uptime: **${days}d ${hours}h ${minutes}m**\n\n` +

      "**⚙️ Tech:**\n" +
      "Library: **discord.js v14**\n" +
      "Language: **Node.js**"
    )
    .setThumbnail(client.user.displayAvatarURL())
    .setColor(0x5865F2)
    .setFooter({ text: "Lake County Roleplay" })
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
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

  setTimeout(async () => {
    const channel = await message.guild.channels.fetch(message.channel.id);
    const msg = await channel.messages.fetch(giveawayMessage.id);
    const reaction = msg.reactions.cache.get("🎉");

    if (!reaction) {
      channel.send("❌ No valid entries.");
      return;
    }

    const users = await reaction.users.fetch();
    const entries = users.filter(u => !u.bot).map(u => u.id);

    if (entries.length < winnersCount) {
      channel.send("❌ Not enough entries.");
      return;
    }

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
      return message.reply("❌ Only admins can set the counting channel.");

    countingChannelId = message.channel.id;
    currentCount = 0;
    lastCounterId = null;
    saveData();

    message.channel.send("🔢 **This channel is now the counting channel!** Start with **1**.");
  }

/* 📊 SESSION POLL */
if (message.content === "!sessionpoll") {
  if (!message.member.roles.cache.has(ANNOUNCEMENT_ROLE_ID))
    return message.reply("❌ You are not authorized to use this command.");

  const embed = new EmbedBuilder()
    .setTitle("📊 Session Poll")
    .setDescription(
      "**Session Poll!**\n\n" +
      "A session poll has been initiated, please react below whether you'll be able to attend this session or not.\n\n" +
      "**🟢 6+ ticks needed for the session to start**"
    )
    .setImage("https://media.discordapp.net/attachments/1452829338545160285/1466919030127591613/ILLEGAL_FIREARM_1.png")
    .setColor(0x00BFFF)
    .setFooter({ text: "Lake County Roleplay" })
    .setTimestamp();

  const pollMessage = await message.channel.send({
    content: "@everyone",
    embeds: [embed],
    allowedMentions: { parse: ["everyone"] }
  });

  await pollMessage.react("✅");
  await pollMessage.react("❌");
}

/* 🔻 SERVER SHUTDOWN */
if (message.content === "!ssd") {
  if (!message.member.roles.cache.has(ANNOUNCEMENT_ROLE_ID))
    return message.reply("❌ You are not authorized to use this command.");

  const embed = new EmbedBuilder()
    .setTitle("🔻 Server Shutdown!")
    .setDescription(
      "**LCRPC** has shut down temporarily.\n\n" +
      "----------------------------------------------------------------------------------------------\n\n" +
      "**Server Information:**\n" +
      "Game Code: **ILCRPC**\n" +
      "Server Owner: **MiningMavenYT**"
    )
    .setImage("https://media.discordapp.net/attachments/1452829338545160285/1466919030127591613/ILLEGAL_FIREARM_1.png")
    .setColor(0xE74C3C)
    .setFooter({ text: "Lake County Roleplay" })
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
}


/* 🟢 SERVER STARTUP */
if (message.content === "!ssu") {
  if (!message.member.roles.cache.has(ANNOUNCEMENT_ROLE_ID))
    return message.reply("❌ You are not authorized to use this command.");

  const embed = new EmbedBuilder()
    .setTitle("🟢 Server Startup!")
    .setDescription(
      "*A game session has begun. To join, just read the details provided below.*\n\n" +
      "---------------------------------------------------------------------\n\n" +
      "**Server Information:**\n" +
      "Game Code: **ILCRPC**\n" +
      "Server Owner: **MiningMavenYT**\n\n" +
      "*Those who reacted must join*"
    )
    .setImage("https://media.discordapp.net/attachments/1452829338545160285/1466919030127591613/ILLEGAL_FIREARM_1.png")
    .setColor(0x2ECC71)
    .setFooter({ text: "Lake County Roleplay" })
    .setTimestamp();

  message.channel.send({
    content: `<@&1468213717035384882>`,
    embeds: [embed],
    allowedMentions: { roles: ["1468213717035384882"] }
  });
}

/* ℹ️ SESSION INFORMATION */
if (message.content === "!sessioninfo") {
  if (!message.member.roles.cache.has(ANNOUNCEMENT_ROLE_ID))
    return message.reply("❌ You are not authorized to use this command.");

  const embed = new EmbedBuilder()
    .setTitle("ℹ️ Session Information")
    .setDescription(
      "Sessions are hosted whenever game moderators are available for a duty. " +
      "You can find a schedule below with an estimated uptime for SSU sessions.\n\n" +

      "**Session times:**\n" +
      "*Weekdays Uptime (CST)  |  Weekends Uptime (CST)*\n" +
      "***1:00 PM → 11:00 PM   |   9:00 AM → 12:00 AM***\n\n" +

      "**Session Information:**\n" +
      "Game Code: **ILCRPC**\n" +
      "Server Owner: **MiningMavenYT**"
    )
    .setImage("https://media.discordapp.net/attachments/1452829338545160285/1466919030127591613/ILLEGAL_FIREARM_1.png")
    .setColor(0x3498DB) // info blue
    .setFooter({ text: "Lake County Roleplay" })
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
}

  /* 🔢 COUNTING LOGIC */
  if (message.channel.id === countingChannelId) {
    const number = parseInt(message.content);
    if (isNaN(number)) return message.delete().catch(() => {});

    if (message.author.id === lastCounterId || number !== currentCount + 1) {
      currentCount = 0;
      lastCounterId = null;
      saveData();
      await message.delete().catch(() => {});
      return message.channel.send("❌ Wrong count! The count has been reset to **0**.")
        .then(m => setTimeout(() => m.delete(), 3000));
    }

    currentCount = number;
    lastCounterId = message.author.id;
    saveData();
    return message.react("✅").catch(() => {});
  }

  /* 🧹 PURGE */
  if (message.content.startsWith("!purge")) {
    if (!message.member.roles.cache.has(PURGE_ROLE_ID))
      return message.reply("❌ You do not have permission.");

    const amount = parseInt(message.content.split(" ")[1]);
    if (!amount || amount < 1 || amount > 100)
      return message.reply("⚠️ Usage: `!purge <1-100>`");

    await message.delete().catch(() => {});
    await message.channel.bulkDelete(amount, true);
  }

/* ⚠️ WARN */
if (message.content.startsWith("!warn")) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
    return message.reply("❌ Staff only.");

  const user = getTargetUser(message, 1);
  const reason = message.content.split(" ").slice(2).join(" ");

  if (!user || !reason)
    return message.reply("Usage: `!warn @user reason` or `!warn userID reason`");

  warnings[user.id] ??= [];
  warnings[user.id].push({
    reason,
    staff: message.author.tag,
    date: new Date().toLocaleString()
  });

  saveData();

  message.channel.send(
    `⚠️ <@${user.id}> warned.\n` +
    `📊 Total warnings: **${warnings[user.id].length}**`
  );
}

/* 📋 WARNINGS (STAFF) */
if (message.content.startsWith("!warnings")) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
    return message.reply("❌ Staff only.");

  const user = getTargetUser(message, 1);
  if (!user)
    return message.reply("Usage: `!warnings @user` or `!warnings userID`");

  const list = warnings[user.id] || [];
  if (!list.length)
    return message.reply("✅ This user has no warnings.");

  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Warnings for ${user.tag || user.id}`)
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

  const user = getTargetUser(message, 1);
  if (!user)
    return message.reply("Usage: `!clearwarnings @user` or `!clearwarnings userID`");

  if (!warnings[user.id] || !warnings[user.id].length)
    return message.reply("✅ This user has no warnings.");

  warnings[user.id] = [];
  saveData();

  message.channel.send(`🧹 All warnings cleared for <@${user.id}>.`);
}

  /* 👤 MY WARNS */
  if (message.content === "!mywarns") {
    const list = warnings[message.author.id] || [];
    if (!list.length) return message.reply("✅ You have no warnings.");

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Your Warnings")
      .setDescription(
        list.map((w, i) =>
          `**${i + 1}.** ${w.reason} — ${w.date}`
        ).join("\n\n")
      )
      .setColor(0x3498DB);

    message.reply({ embeds: [embed] });
  }

  /* 🧪 TEST WELCOME */
  if (message.content === "!testwelcome") {
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      client.emit("guildMemberAdd", message.member);
  }

  /* 🧪 TEST LEAVE */
  if (message.content === "!testleave") {
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      client.emit("guildMemberRemove", message.member);
  }

  /* 🎫 SEND PANEL */
  if (message.content === "!sendpanel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only.");

    const embed = new EmbedBuilder()
      .setTitle("🎫 Support Tickets")
      .setDescription(
        "**Need help? You’re in the right place.**\n\n" +
        "If you have a question, need assistance, or want to report an issue, " +
        "please open a ticket using the button below. Our staff team will respond as soon as possible.\n\n" +
        "**Before opening a ticket:**\n" +
        "• Be clear and detailed about your issue\n" +
        "• One issue per ticket\n" +
        "• Remain respectful and patient\n\n" +
        "🔔 **Important:**\n" +
        "Do not ping staff. Tickets are handled in the order they are received.\n\n" +
        "Thank you for reaching out — we’re here to help! 💙"
      )
      .setImage("https://media.discordapp.net/attachments/1442342822299566174/1466612239116013791/West_Virginia_Roleplay_5.png")
      .setColor(0x5865F2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("🎫 Create Ticket")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* ================= TICKETS ================= */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "create_ticket") {
    const existing = interaction.guild.channels.cache.find(
      c => c.topic === `ticket-user:${interaction.user.id}`
    );
    if (existing)
      return interaction.reply({ content: "⚠️ You already have an open ticket.", ephemeral: true });

    const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "-");

    const channel = await interaction.guild.channels.create({
      name: `ticket-${safeName}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      topic: `ticket-user:${interaction.user.id}`,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Support Ticket Opened")
      .setDescription(
        "**Hey there! 👋\nThanks for opening a support ticket.**\n\n" +
        "A member of our **staff team** will be with you shortly.\n" +
        "Please explain your issue in detail so we can assist you as quickly as possible.\n\n" +
        "**While you wait:**\n" +
        "• Be patient — responses may take a moment\n" +
        "• Do not ping staff\n" +
        "• Keep all messages related to this issue in this ticket\n\n" +
        "***We appreciate your patience and cooperation! 💙***"
      )
      .setColor(0x2ECC71);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim_ticket").setLabel("🧑‍💼 Claim").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("unclaim_ticket").setLabel("↩ Unclaim").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Close").setStyle(ButtonStyle.Danger)
    );

    channel.send({
      content: `<@&${STAFF_ROLE_ID}> ${interaction.user}`,
      embeds: [embed],
      components: [buttons]
    });

    interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL_ID)?.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎫 Ticket Opened")
          .setDescription(`${interaction.user.tag} → ${channel}`)
          .setColor(0x2ECC71)
          .setTimestamp()
      ]
    });

    interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
  }

  if (interaction.customId === "claim_ticket") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
      return interaction.reply({ content: "❌ Staff only.", ephemeral: true });

    interaction.channel.send(`🧑‍💼 Ticket claimed by ${interaction.user}`);
    interaction.reply({ content: "✅ Ticket claimed.", ephemeral: true });
  }

  if (interaction.customId === "unclaim_ticket") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
      return interaction.reply({ content: "❌ Staff only.", ephemeral: true });

    interaction.channel.send(`↩ Ticket unclaimed by ${interaction.user}`);
    interaction.reply({ content: "↩ Ticket unclaimed.", ephemeral: true });
  }

  if (interaction.customId === "close_ticket") {
    interaction.reply("🔒 Closing ticket in 3 seconds...");
    setTimeout(() => interaction.channel.delete(), 3000);
  }
});

/* ================= SAFE SHUTDOWN ================= */
process.on("SIGINT", () => { saveData(); process.exit(); });
process.on("SIGTERM", () => { saveData(); process.exit(); });

client.login(process.env.TOKEN);
