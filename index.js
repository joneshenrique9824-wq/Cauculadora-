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

// ================= STORAGE =================
const sessions = new Map();
const logs = [];

// ================= FULL KIT =================
const FULL_KIT = [
  { cat: "freios", item: "race", price: 20000 },
  { cat: "transmissao", item: "race", price: 20000 },
  { cat: "suspensao", item: "4", price: 20000 },
  { cat: "motor", item: "top", price: 40000 },
  { cat: "turbo", item: "1", price: 60000 },
  { cat: "hidraulica", item: "padrao", price: 40000 }
];

// ================= SHOP =================
const shop = {
  freios: { street: 10000, sport: 15000, race: 20000 },
  transmissao: { street: 10000, sport: 15000, race: 20000 },
  suspensao: { "1": 5000, "2": 10000, "3": 15000, "4": 20000 },
  motor: { street: 10000, sport: 20000, top: 40000 },
  turbo: { "1": 60000 },
  hidraulica: { padrao: 40000 }
};

// ================= COMMANDS =================
const commands = [
  new SlashCommandBuilder()
    .setName("oficina")
    .setDescription("🚗 Abrir OVER SPEED"),

  new SlashCommandBuilder()
    .setName("prontuario")
    .setDescription("📒 Ver histórico da oficina")
].map(c => c.toJSON());

// ================= REGISTER =================
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
  return shop[cat]?.[item] || 0;
}

function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      userId: id,
      items: [],
      full: false
    });
  }
  return sessions.get(id);
}

// ================= LOG =================
function saveLog(session, user, total) {
  logs.push({
    cliente: user.username,
    mecanico: user.username,
    itens: session.items,
    total,
    data: new Date().toLocaleString("pt-BR")
  });
}

// ================= PAINEL =================
function panel(session) {

  const total = session.items.reduce((a, b) => a + b.price, 0);

  return new EmbedBuilder()
    .setTitle("🚗 OVER SPEED • OFICINA AUTOMOTIVA")
    .setColor(0x111111)
    .setDescription(
      "💎 Sistema profissional de customização automotiva\n" +
      "⚙ Controle total de performance e estética\n" +
      "🚀 Interface rápida e otimizada 2026"
    )
    .addFields(
      { name: "📦 Itens", value: `${session.items.length}`, inline: true },
      { name: "💰 Total", value: `R$ ${total}`, inline: true },
      { name: "💎 FULL", value: session.full ? "ON 🟢" : "OFF 🔴", inline: true }
    )
    .setFooter({ text: "OVER SPEED SYSTEM" });
}

// ================= MENU =================
function menu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("menu")
      .setPlaceholder("🔧 Categoria")
      .addOptions(
        { label: "Motor", value: "motor" },
        { label: "Freios", value: "freios" },
        { label: "Transmissão", value: "transmissao" },
        { label: "Suspensão", value: "suspensao" },
        { label: "Turbo", value: "turbo" },
        { label: "Hidráulica", value: "hidraulica" }
      )
  );
}

// ================= BUTTONS =================
function buttons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("full").setLabel("💎 FULL KIT").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("clear").setLabel("🧹 RESET").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("finish").setLabel("💰 FINALIZAR").setStyle(ButtonStyle.Success)
  );
}

// ================= READY =================
client.once("clientReady", async () => {
  console.log(`🚗 OVER SPEED ONLINE: ${client.user.tag}`);
  await registerCommands();
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async interaction => {

  const session = getSession(interaction.user.id);

  // ================= OFICINA =================
  if (interaction.isChatInputCommand() && interaction.commandName === "oficina") {

    return interaction.reply({
      embeds: [panel(session)],
      components: [menu(), buttons()],
      flags: EPHEMERAL
    });
  }

  // ================= PRONTUÁRIO (FIX REAL) =================
  if (interaction.isChatInputCommand() && interaction.commandName === "prontuario") {

    if (logs.length === 0) {
      return interaction.reply({
        content: "❌ Nenhum serviço registrado ainda",
        flags: EPHEMERAL
      });
    }

    const last = logs.slice(-5).reverse();

    const embeds = last.map(l =>
      new EmbedBuilder()
        .setTitle("📒 OVER SPEED • PRONTUÁRIO")
        .setColor(0x222222)
        .setDescription(
          l.itens.map(i => `🔧 ${i.cat} ${i.item} → R$ ${i.price}`).join("\n")
        )
        .addFields(
          { name: "👤 Cliente", value: l.cliente },
          { name: "🔧 Mecânico", value: l.mecanico },
          { name: "💰 Total", value: `R$ ${l.total}` },
          { name: "📅 Data", value: l.data }
        )
    );

    return interaction.reply({
      embeds,
      flags: EPHEMERAL
    });
  }

  // ================= MENU =================
  if (interaction.isStringSelectMenu() && interaction.customId === "menu") {

    const cat = interaction.values[0];

    const options = Object.keys(shop[cat]).map(i => ({
      label: `${i} - R$ ${shop[cat][i]}`,
      value: `${cat}|${i}`
    }));

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("item")
        .setPlaceholder("Selecionar peça")
        .addOptions(options)
    );

    return interaction.update({
      embeds: [panel(session)],
      components: [select, buttons()]
    }).catch(() => {});
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
      content: "✔ Upgrade aplicado",
      flags: EPHEMERAL
    });
  }

  // ================= FULL KIT =================
  if (interaction.customId === "full") {

    const keys = new Set(FULL_KIT.map(f => `${f.cat}|${f.item}`));

    if (!session.full) {
      session.items.push(...FULL_KIT);
      session.full = true;
    } else {
      session.items = session.items.filter(i =>
        !keys.has(`${i.cat}|${i.item}`)
      );
      session.full = false;
    }

    return interaction.update({
      embeds: [panel(session)],
      components: [menu(), buttons()]
    }).catch(() => {});
  }

  // ================= RESET =================
  if (interaction.customId === "clear") {

    session.items = [];
    session.full = false;

    return interaction.update({
      embeds: [panel(session)],
      components: [menu(), buttons()]
    }).catch(() => {});
  }

  // ================= FINAL =================
  if (interaction.customId === "finish") {

    const total = session.items.reduce((a, b) => a + b.price, 0);

    saveLog(session, interaction.user, total);

    session.items = [];
    session.full = false;

    return interaction.reply({
      content: `🚗 Serviço finalizado!\n💰 Total: R$ ${total}`,
      flags: EPHEMERAL
    });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
