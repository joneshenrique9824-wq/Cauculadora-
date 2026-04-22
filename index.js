import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

// ================= BOT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= ENV =================
const TOKEN = process.env.TOKEN?.trim();
const CLIENT_ID = process.env.CLIENT_ID?.trim();
const GUILD_ID = process.env.GUILD_ID?.trim();
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// ================= SESSÕES =================
const sessions = new Map();

// ================= PREÇOS =================
const itens = {
  freios: { street: 10000, sport: 15000, race: 20000 },
  transmissao: { street: 10000, sport: 15000, race: 20000 },
  suspensao: { "1": 5000, "2": 10000, "3": 15000, "4": 20000 },
  blindagem: { "20": 50000, "40": 60000, "60": 70000, "80": 80000, "100": 90000 },
  motor: { street: 10000, sport: 20000, race: 30000, top: 40000 },
  turbo: { "1": 60000 },
  visual: {
    xenon: 40000,
    neon: 30000,
    rodas: 90000,
    pintura: 20000,
    spoiler: 20000,
    escapamento: 10000
  },
  interior: {
    banco: 30000,
    volante: 35000,
    som: 30000,
    painel: 20000
  },
  vidros: {
    fume100: 40000,
    fume70: 40000,
    fume50: 40000
  }
};

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName("tuning")
    .setDescription("🚗 Painel Premium Bella Motors"),

  new SlashCommandBuilder()
    .setName("oficina")
    .setDescription("🔧 Oficina Bella Motors")
].map(c => c.toJSON());

// ================= REGISTRAR =================
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Comandos registrados!");
}

// ================= HELPERS =================
function getPrice(cat, item) {
  return itens[cat]?.[item] || 0;
}

// ================= MENUS =================
function menuPrincipal() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("menu_cat")
      .setPlaceholder("🚗 Escolha uma categoria")
      .addOptions(
        { label: "Freios", value: "freios" },
        { label: "Motor", value: "motor" },
        { label: "Turbo", value: "turbo" },
        { label: "Visual", value: "visual" },
        { label: "Interior", value: "interior" },
        { label: "Vidros", value: "vidros" },
        { label: "Blindagem", value: "blindagem" }
      )
  );
}

function botoes() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("voltar")
      .setLabel("⬅ Voltar")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("finalizar")
      .setLabel("💰 Finalizar Full Tuning")
      .setStyle(ButtonStyle.Success)
  );
}

// ================= LOG =================
async function sendLog(session) {
  if (!LOG_CHANNEL_ID) return;

  const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const total = session.items.reduce((a, b) => a + b.price, 0);

  const embed = new EmbedBuilder()
    .setTitle("🚗 LOG FULL TUNING")
    .setColor(0xff0000)
    .addFields(
      { name: "👤 Cliente", value: session.userId },
      { name: "💰 Total", value: `R$ ${total}` },
      { name: "📦 Itens", value: session.items.map(i => `${i.cat} ${i.item} - R$ ${i.price}`).join("\n") }
    );

  channel.send({ embeds: [embed] });
}

// ================= READY =================
client.once("ready", async () => {
  console.log(`🔥 Online como ${client.user.tag}`);
  await registerCommands();
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async interaction => {

  // ================= ABRIR =================
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "tuning" || interaction.commandName === "oficina") {

      sessions.set(interaction.user.id, {
        userId: interaction.user.id,
        items: []
      });

      return interaction.reply({
        content: "🚗 **PAINEL BELLA MOTORS ABERTO**",
        components: [menuPrincipal(), botoes()],
        ephemeral: true
      });
    }
  }

  // ================= MENU CATEGORIA =================
  if (interaction.isStringSelectMenu() && interaction.customId === "menu_cat") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    const cat = interaction.values[0];

    const options = Object.keys(itens[cat]).map(i => ({
      label: `${i} - R$ ${itens[cat][i]}`,
      value: `${cat}|${i}`
    }));

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("item")
        .setPlaceholder("Escolha o item")
        .addOptions(options)
    );

    return interaction.update({
      content: `🔧 Categoria: **${cat.toUpperCase()}**`,
      components: [menu, botoes()]
    });
  }

  // ================= ITEM =================
  if (interaction.isStringSelectMenu() && interaction.customId === "item") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    const [cat, item] = interaction.values[0].split("|");

    session.items.push({
      cat,
      item,
      price: getPrice(cat, item)
    });

    const total = session.items.reduce((a, b) => a + b.price, 0);

    return interaction.reply({
      content: `✔ Adicionado: **${cat} ${item}**\n💰 Total parcial: R$ ${total}`,
      ephemeral: true
    });
  }

  // ================= BOTÕES =================
  if (interaction.isButton()) {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    // VOLTAR
    if (interaction.customId === "voltar") {
      return interaction.update({
        content: "🚗 Painel principal",
        components: [menuPrincipal(), botoes()]
      });
    }

    // FINALIZAR
    if (interaction.customId === "finalizar") {

      if (!session.items.length) {
        return interaction.reply({
          content: "❌ Nenhum item selecionado!",
          ephemeral: true
        });
      }

      const total = session.items.reduce((a, b) => a + b.price, 0);

      const embed = new EmbedBuilder()
        .setTitle("🚗 FULL TUNING COMPLETO")
        .setColor(0xff0000)
        .setDescription(
          session.items.map(i =>
            `• ${i.cat} ${i.item} → R$ ${i.price}`
          ).join("\n")
        )
        .addFields(
          { name: "👤 Cliente", value: session.userId },
          { name: "💰 Total Final", value: `R$ ${total}` }
        );

      await sendLog(session);

      sessions.delete(interaction.user.id);

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  }
});

// ================= LOGIN =================
client.login(TOKEN);
