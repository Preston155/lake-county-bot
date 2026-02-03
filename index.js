require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  Partials
} = require("discord.js");

/* ================= CLIENT ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

/* ================= CONFIG ================= */
const CONFIG = {
  STAFF_ROLE_ID: "1282417060391161978",

  WELCOME_CHANNEL_ID: "1460994169697730560",
  LEAVE_CHANNEL_ID: "1460994659848421377",

  TICKET_CATEGORY_ID: "1468276842942435338"
};

/* ================= READY ================= */
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ================= WELCOME ================= */
client.on("guildMemberAdd", member => {
  const channel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
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
      "https://media.discordapp.net/attachments/1442342822299566174/1466612239116013791/West_Virginia_Roleplay_5.png"
    )
    .setTimestamp();

  channel.send({ content: `${member}`, embeds: [embed] });
});

/* ================= LEAVE ================= */
client.on("guildMemberRemove", member => {
  const channel = member.guild.channels.cache.get(CONFIG.LEAVE_CHANNEL_ID);
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

  /* 🎫 TICKET PANEL */
  if (message.content === "!ticketpanel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admins only.");

    const embed = new EmbedBuilder()
      .setTitle("🎫 Lake County Roleplay — Assistance")
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
      .setImage(
        "https://media.discordapp.net/attachments/1442342822299566174/1466612239116013791/West_Virginia_Roleplay_5.png"
      )
      .setFooter({ text: "Lake County Roleplay Support" });

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("Request Assistance...")
        .addOptions(
          {
            label: "👥 General Support",
            description: "General questions, help, or concerns",
            value: "general"
          },
          {
            label: "🤝 Partnership Support",
            description: "Partnership & collaboration requests",
            value: "partnership"
          },
          {
            label: "🛡️ Internal Affairs",
            description: "Staff reports or appeals",
            value: "internal"
          },
          {
            label: "🛠️ Management Support",
            description: "Store purchases or high-rank issues",
            value: "management"
          }
        )
    );

    return message.channel.send({ embeds: [embed], components: [menu] });
  }
});

/* ================= INTERACTION HANDLER ================= */
client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "ticket_select") return;

  const existing = interaction.guild.channels.cache.find(
    c => c.topic === `ticket-user:${interaction.user.id}`
  );

  if (existing)
    return interaction.reply({
      content: "❌ You already have an open ticket.",
      ephemeral: true
    });

  const channel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username.toLowerCase()}`,
    type: ChannelType.GuildText,
    parent: CONFIG.TICKET_CATEGORY_ID,
    topic: `ticket-user:${interaction.user.id}`,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      },
      {
        id: CONFIG.STAFF_ROLE_ID,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      }
    ]
  });

  await channel.send({
    content: `${interaction.user} <@&${CONFIG.STAFF_ROLE_ID}>`,
    embeds: [
      new EmbedBuilder()
        .setTitle("🎫 Ticket Opened")
        .setDescription(
          "Thank you for contacting **Lake County Roleplay Support**.\n\n" +
          "Please describe your issue in detail and a staff member will assist you shortly."
        )
        .setColor(0x00BFFF)
        .setTimestamp()
    ]
  });

  interaction.reply({
    content: `✅ Ticket created: ${channel}`,
    ephemeral: true
  });
});

/* ================= LOGIN ================= */
client.login(process.env.TOKEN);
