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

// ================= SESSÕES =================
const sessions = new Map();

// ================= FULL TUNING =================
const FULL_TUNING = [
  { cat: "freios", item: "race", price: 20000 },
  { cat: "transmissao", item: "race", price: 20000 },
  { cat: "suspensao", item: "4", price: 20000 },
  { cat: "motor", item: "top", price: 40000 },
  { cat: "turbo", item: "1", price: 60000 },
  { cat: "hidraulica", item: "padrao", price: 40000 }
];

// ================= ITENS =================
const itens = {
  freios: { street: 10000, sport: 15000, race: 20000 },
  transmissao: { street: 10000, sport: 15000, race: 20000 },
  suspensao: { "1": 5000, "2": 10000, "3": 15000, "4": 20000 },
  motor: { street: 10000, sport: 20000, race: 30000, top: 40000 },
  turbo: { "1": 60000 },
  hidraulica: { padrao: 40000 },

  visual: {
    xenon: 40000,
    neon: 30000,
    rodas: 90000,
    pintura: 20000
  },

  interior: {
    banco: 30000,
    volante: 35000,
    som: 30000
  }
};

// ================= HELPERS =================
function getPrice(cat, item) {
  return itens[cat]?.[item] || 0;
}

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName("tuning")
    .setDescription("🚗 LS Customs Premium Panel")
].map(c => c.toJSON());

// ================= REGISTRO =================
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Comandos registrados!");
}

// ================= PAINEL HOME =================
function homePanel(session) {

  const total = session.items.reduce((a, b) => a + b.price, 0);

  return new EmbedBuilder()
    .setTitle("🚗 LS CUSTOMS • PREMIUM PANEL")
    .setColor(0x2b2d31)
    .setDescription(
      "💎 Oficina Premium LS Customs\n\n" +
      "Selecione peças ou use FULL TUNING automático\n" +
      "Sistema inteligente de cálculo"
    )
    .addFields(
      {
        name: "📦 Itens",
        value: session.items.length
          ? `${session.items.length} selecionados`
          : "Nenhum item"
      },
      {
        name: "💰 Total",
        value: `R$ ${total}`
      }
    )
    .setFooter({ text: "LS Customs • Sistema Premium RP" });
}

// ================= MENU =================
function menuPanel() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("menu")
      .setPlaceholder("🔧 Escolha categoria")
      .addOptions(
        { label: "Motor", value: "motor" },
        { label: "Visual", value: "visual" },
        { label: "Interior", value: "interior" },
        { label: "Freios", value: "freios" },
        { label: "Transmissão", value: "transmissao" }
      )
  );
}

// ================= BOTÕES =================
function buttons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("full")
      .setLabel("💎 FULL TUNING")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("home")
      .setLabel("🏠 HOME")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("clear")
      .setLabel("🧹 LIMPAR")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("finish")
      .setLabel("💰 FINALIZAR")
      .setStyle(ButtonStyle.Success)
  );
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

    if (interaction.commandName === "tuning") {

      sessions.set(interaction.user.id, {
        userId: interaction.user.id,
        items: []
      });

      return interaction.reply({
        embeds: [homePanel({ items: [] })],
        components: [menuPanel(), buttons()],
        ephemeral: true
      });
    }
  }

  // ================= MENU =================
  if (interaction.isStringSelectMenu() && interaction.customId === "menu") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    const cat = interaction.values[0];

    const options = Object.keys(itens[cat]).map(i => ({
      label: `${i} - R$ ${itens[cat][i]}`,
      value: `${cat}|${i}`
    }));

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("item")
        .setPlaceholder("🔧 Escolha peça")
        .addOptions(options)
    );

    return interaction.update({
      embeds: [homePanel(session)],
      components: [select, buttons()]
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

    return interaction.reply({
      content: `✔ Adicionado: **${cat} ${item}**`,
      ephemeral: true
    });
  }

  // ================= FULL TUNING =================
  if (interaction.customId === "full") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    session.items.push(...FULL_TUNING);

    return interaction.update({
      embeds: [homePanel(session)],
      components: [menuPanel(), buttons()]
    });
  }

  // ================= HOME =================
  if (interaction.customId === "home") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    return interaction.update({
      embeds: [homePanel(session)],
      components: [menuPanel(), buttons()]
    });
  }

  // ================= LIMPAR =================
  if (interaction.customId === "clear") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    session.items = [];

    return interaction.update({
      embeds: [homePanel(session)],
      components: [menuPanel(), buttons()]
    });
  }

  // ================= FINALIZAR =================
  if (interaction.customId === "finish") {

    const session = sessions.get(interaction.user.id);
    if (!session || !session.items.length) {
      return interaction.reply({
        content: "❌ Nenhum item selecionado!",
        ephemeral: true
      });
    }

    const total = session.items.reduce((a, b) => a + b.price, 0);

    const embed = new EmbedBuilder()
      .setTitle("🚗 SERVIÇO FINALIZADO")
      .setColor(0x00ff99)
      .setDescription(
        session.items.map(i =>
          `• ${i.cat} ${i.item} → R$ ${i.price}`
        ).join("\n")
      )
      .addFields(
        { name: "💰 TOTAL FINAL", value: `R$ ${total}` }
      );

    sessions.delete(session.userId);

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
