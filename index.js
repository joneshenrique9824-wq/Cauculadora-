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

const EPHEMERAL = 1 << 6;

// ================= SISTEMA =================
const sessions = new Map();
const logs = [];

// ================= CACHE (ANTI LAG) =================
const menuCache = new Map();

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
  hidraulica: { padrao: 40000 }
};

// ================= HELPERS =================
function getPrice(cat, item) {
  return itens[cat]?.[item] || 0;
}

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      userId,
      items: [],
      fullActive: false
    });
  }
  return sessions.get(userId);
}

// ================= SAFE UPDATE =================
async function safeUpdate(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp(payload);
    }
    return await interaction.update(payload);
  } catch (e) {
    console.log("Update ignorado:", e.message);
  }
}

// ================= LOG =================
function addLog(session, interaction, total) {
  const log = {
    clienteNome: interaction.user.username,
    mecanicoNome: interaction.user.username,
    itens: session.items,
    total,
    data: new Date().toLocaleString("pt-BR")
  };
  logs.push(log);
}

// ================= PAINEL (LEVE) =================
function painel(session) {

  const total = session.items.reduce((a, b) => a + b.price, 0);

  return new EmbedBuilder()
    .setTitle("🚗 OVER SPEED • OFICINA AUTOMOTIVA")
    .setColor(0x111111)
    .setDescription(
      "💎 Sistema profissional de tuning automotivo\n" +
      "⚙ Performance + estética + controle total\n\n" +
      "🚀 Resposta otimizada e fluida"
    )
    .addFields(
      { name: "📦 Itens", value: `${session.items.length}`, inline: true },
      { name: "💰 Total", value: `R$ ${total}`, inline: true },
      { name: "💎 FULL", value: session.fullActive ? "🟢 ON" : "🔴 OFF", inline: true }
    )
    .setFooter({ text: "OVER SPEED SYSTEM" });
}

// ================= MENU CACHE =================
function getMenu(cat) {

  if (menuCache.has(cat)) return menuCache.get(cat);

  const options = Object.keys(itens[cat]).map(i => ({
    label: `${i} - R$ ${itens[cat][i]}`,
    value: `${cat}|${i}`
  }));

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("item")
      .setPlaceholder("Escolha peça")
      .addOptions(options)
  );

  menuCache.set(cat, menu);
  return menu;
}

// ================= BOTÕES =================
function buttons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("full").setLabel("💎 FULL").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("clear").setLabel("🧹 LIMPAR").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("finish").setLabel("💰 FINALIZAR").setStyle(ButtonStyle.Success)
  );
}

// ================= READY =================
client.once("clientReady", () => {
  console.log(`🚗 OVER SPEED ONLINE: ${client.user.tag}`);
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async interaction => {

  const session = getSession(interaction.user.id);

  // ================= ABRIR =================
  if (interaction.isChatInputCommand() && interaction.commandName === "oficina") {

    return interaction.reply({
      embeds: [painel(session)],
      components: [getMenu("motor"), buttons()],
      flags: EPHEMERAL
    });
  }

  // ================= ITEM =================
  if (interaction.isStringSelectMenu() && interaction.customId === "item") {

    const [cat, item] = interaction.values[0].split("|");

    session.items.push({
      cat,
      item,
      price: getPrice(cat, item)
    });

    return interaction.reply({
      content: "✔ Aplicado com sucesso",
      flags: EPHEMERAL
    });
  }

  // ================= FULL =================
  if (interaction.customId === "full") {

    const keys = new Set(FULL_TUNING.map(f => `${f.cat}|${f.item}`));

    if (!session.fullActive) {
      session.items.push(...FULL_TUNING);
      session.fullActive = true;
    } else {
      session.items = session.items.filter(i =>
        !keys.has(`${i.cat}|${i.item}`)
      );
      session.fullActive = false;
    }

    return safeUpdate(interaction, {
      embeds: [painel(session)],
      components: [getMenu("motor"), buttons()]
    });
  }

  // ================= LIMPAR =================
  if (interaction.customId === "clear") {

    session.items = [];
    session.fullActive = false;

    return safeUpdate(interaction, {
      embeds: [painel(session)],
      components: [getMenu("motor"), buttons()]
    });
  }

  // ================= FINALIZAR =================
  if (interaction.customId === "finish") {

    const total = session.items.reduce((a, b) => a + b.price, 0);

    addLog(session, interaction, total);

    session.items = [];
    session.fullActive = false;

    return interaction.reply({
      content: `🚗 Serviço finalizado!\n💰 Total: R$ ${total}`,
      flags: EPHEMERAL
    });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
