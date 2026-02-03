require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  EmbedBuilder
} = require("discord.js");

/* ======================
   CLIENT SETUP
====================== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

client.commands = new Collection();

/* ======================
   READY EVENT
====================== */

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity("Lake County Roleplay", { type: 3 }); // WATCHING
});

/* ======================
   BASIC MESSAGE COMMAND
====================== */

const PREFIX = "!";

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  /* PING COMMAND */
  if (command === "ping") {
    return message.reply(`🏓 Pong! Latency: **${client.ws.ping}ms**`);
  }

  /* TEST EMBED */
  if (command === "embed") {
    const embed = new EmbedBuilder()
      .setTitle("✅ Bot Online")
      .setDescription("Your bot is running smoothly on Railway 🚄")
      .setColor(0x2ecc71)
      .setFooter({ text: "Lake County Roleplay" })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
});

/* ======================
   ERROR HANDLING (IMPORTANT)
====================== */

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
});

/* ======================
   LOGIN
====================== */

if (!process.env.TOKEN) {
  console.error("❌ TOKEN is missing! Check Railway variables.");
  process.exit(1);
}

client.login(process.env.TOKEN);
