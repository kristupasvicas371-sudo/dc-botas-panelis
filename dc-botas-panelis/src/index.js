require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require("discord.js");
const { status } = require("minecraft-server-util");
const { Rcon } = require("rcon-client");

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  MC_HOST = "MCDD.LT",
  MC_PORT = "25565",
  RULES_CHANNEL_ID,
  ADMIN_ROLE_ID,
  MC_RCON_HOST = "MCDD.LT",
  MC_RCON_PORT = "25575",
  MC_RCON_PASSWORD
} = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("Truksta .env reiksmiu: DISCORD_TOKEN, CLIENT_ID, GUILD_ID");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Parodo visas komandas"),
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Atidaro valdymo paneli"),
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Parodo Minecraft serverio busena"),
  new SlashCommandBuilder()
    .setName("ip")
    .setDescription("Parodo prisijungimo IP"),
  new SlashCommandBuilder()
    .setName("mc")
    .setDescription("Paleidzia Minecraft komanda per RCON (tik admin)")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Pvz: list, say Sveiki, time set day")
        .setRequired(true)
        .setMaxLength(200)
    )
].map((command) => command.toJSON());

function isAdmin(interaction) {
  const hasAdminPerm = interaction.memberPermissions?.has(
    PermissionFlagsBits.Administrator
  );
  const hasAllowedRole =
    ADMIN_ROLE_ID && interaction.member?.roles?.cache?.has(ADMIN_ROLE_ID);

  return Boolean(hasAdminPerm || hasAllowedRole);
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands
  });
}

async function getServerStatus() {
  const response = await status(MC_HOST, Number(MC_PORT), {
    timeout: 5000,
    enableSRV: true
  });

  const playersOnline = response.players?.online ?? 0;
  const playersMax = response.players?.max ?? 0;
  const version = response.version?.name ?? "Nezinoma";
  const motdRaw = Array.isArray(response.motd?.clean)
    ? response.motd.clean.join(" ")
    : response.motd?.clean || "Nenurodyta";

  return {
    playersOnline,
    playersMax,
    version,
    motd: String(motdRaw).slice(0, 1000)
  };
}

function buildStatusEmbedOnline(server) {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("MCDD.LT statusas")
    .addFields(
      { name: "IP", value: `\`${MC_HOST}:${MC_PORT}\``, inline: true },
      {
        name: "Zaidejai",
        value: `\`${server.playersOnline}/${server.playersMax}\``,
        inline: true
      },
      { name: "Versija", value: `\`${server.version}\``, inline: true },
      { name: "MOTD", value: server.motd || "Nenurodyta" }
    )
    .setTimestamp(new Date());
}

function buildStatusEmbedOffline(errorMessage) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("MCDD.LT statusas")
    .setDescription("Serveris siuo metu nepasiekiamas arba offline.")
    .addFields({ name: "Klaida", value: `\`${errorMessage.slice(0, 200)}\`` })
    .setTimestamp(new Date());
}

function buildPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("MCDD.LT Valdymo panele")
    .setDescription(
      "Naudok mygtukus zemiau. Admin veiksmams naudok `/mc` komanda."
    )
    .addFields(
      { name: "Statusas", value: "Patikrina ar serveris online" },
      { name: "IP", value: "Parodo prisijungimo adresa" },
      { name: "Taisykles", value: "Nukreipia i taisykliu kanala" }
    );
}

function buildPanelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_status")
      .setLabel("Statusas")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("panel_ip")
      .setLabel("IP")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("panel_rules")
      .setLabel("Taisykles")
      .setStyle(ButtonStyle.Secondary)
  );
}

async function runRconCommand(command) {
  if (!MC_RCON_PASSWORD) {
    throw new Error("MC_RCON_PASSWORD nenurodytas .env faile");
  }

  const rcon = await Rcon.connect({
    host: MC_RCON_HOST,
    port: Number(MC_RCON_PORT),
    password: MC_RCON_PASSWORD
  });

  try {
    const result = await rcon.send(command);
    return result || "Komanda ivykdyta (tuscias atsakymas).";
  } finally {
    await rcon.end();
  }
}

client.once("ready", async () => {
  try {
    await registerCommands();
    console.log(`Botas paleistas: ${client.user.tag}`);
    console.log("Slash komandos uzregistruotos.");
  } catch (error) {
    console.error("Nepavyko uzregistruoti slash komandu:", error.message);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "help") {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("Komandos")
          .addFields(
            { name: "/panel", value: "Atidaro valdymo panele" },
            { name: "/status", value: "Parodo serverio busena" },
            { name: "/ip", value: "Parodo serverio IP" },
            {
              name: "/mc <command>",
              value: "RCON komanda adminams (pvz: list, say Sveiki)"
            }
          );

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      if (interaction.commandName === "panel") {
        await interaction.reply({
          embeds: [buildPanelEmbed()],
          components: [buildPanelButtons()]
        });
        return;
      }

      if (interaction.commandName === "ip") {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("MCDD.LT prisijungimas")
              .setDescription(`Prisijungimo IP: **\`${MC_HOST}\`**`)
              .addFields({ name: "Portas", value: `\`${MC_PORT}\`` })
          ]
        });
        return;
      }

      if (interaction.commandName === "status") {
        await interaction.deferReply();

        try {
          const server = await getServerStatus();
          await interaction.editReply({ embeds: [buildStatusEmbedOnline(server)] });
        } catch (error) {
          await interaction.editReply({
            embeds: [buildStatusEmbedOffline(error.message)]
          });
        }

        return;
      }

      if (interaction.commandName === "mc") {
        if (!isAdmin(interaction)) {
          await interaction.reply({
            content: "Neturi teisiu naudoti sios komandos.",
            ephemeral: true
          });
          return;
        }

        const command = interaction.options.getString("command", true);
        await interaction.deferReply({ ephemeral: true });

        try {
          const output = await runRconCommand(command);
          await interaction.editReply({
            content: `Komanda: \`${command}\`\nAtsakymas:\n\`\`\`${String(output).slice(
              0,
              1800
            )}\`\`\``
          });
        } catch (error) {
          await interaction.editReply({
            content: `RCON klaida: \`${error.message}\``
          });
        }

        return;
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "panel_ip") {
        await interaction.reply({
          content: `Prisijungimo IP: **\`${MC_HOST}:${MC_PORT}\`**`,
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === "panel_rules") {
        const rulesText = RULES_CHANNEL_ID
          ? `Taisykles rasi <#${RULES_CHANNEL_ID}>.`
          : "Taisykles rasi kanale #taisykles.";

        await interaction.reply({ content: rulesText, ephemeral: true });
        return;
      }

      if (interaction.customId === "panel_status") {
        await interaction.deferReply({ ephemeral: true });

        try {
          const server = await getServerStatus();
          await interaction.editReply({ embeds: [buildStatusEmbedOnline(server)] });
        } catch (error) {
          await interaction.editReply({
            embeds: [buildStatusEmbedOffline(error.message)]
          });
        }
      }
    }
  } catch (error) {
    console.error("Interaction klaida:", error.message);

    const fallback = {
      content: "Ivyko klaida vykdant komanda.",
      ephemeral: true
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(fallback).catch(() => undefined);
    } else {
      await interaction.reply(fallback).catch(() => undefined);
    }
  }
});

client.login(DISCORD_TOKEN);
