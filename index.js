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

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= CONFIG =================
const TOKEN = process.env.TOKEN?.trim();
const CLIENT_ID = process.env.CLIENT_ID?.trim();
const GUILD_ID = process.env.GUILD_ID?.trim();

const EPHEMERAL = 1 << 6;

// ================= DATABASE =================
const db = {
  services: []
};

// ================= SESSION =================
const sessions = new Map();

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

// ================= SESSION =================
function session(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      id,
      items: [],
      full: false
    });
  }
  return sessions.get(id);
}

// ================= PRICE =================
const price = (c, i) => shop[c]?.[i] || 0;

// ================= SERVICE ID =================
function generateId() {
  return `OS-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

// ================= HOME =================
function home(s) {

  const total = s.items.reduce((a, b) => a + b.price, 0);

  return new EmbedBuilder()
    .setTitle("🚗 OVER SPEED • GTA RP GARAGE")
    .setColor(0x0b0b0b)
    .setDescription(
      "💎 Sistema de oficina automotiva RP\n\n" +
      "🔧 Tuning completo de veículos\n" +
      "⚙ Performance e upgrades profissionais\n\n" +
      "📌 Selecione uma categoria abaixo"
    )
    .addFields(
      { name: "📦 ITENS", value: `${s.items.length}`, inline: true },
      { name: "💰 TOTAL", value: `R$ ${total}`, inline: true },
      { name: "💎 FULL KIT", value: s.full ? "ATIVO 🟢" : "OFF 🔴", inline: true }
    )
    .setFooter({ text: "OVER SPEED SYSTEM RP" });
}

// ================= MENU =================
function menu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("menu")
      .setPlaceholder("🚗 Escolha categoria")
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
    new ButtonBuilder()
      .setCustomId("back")
      .setLabel("⬅ VOLTAR")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("full")
      .setLabel("💎 FULL KIT")
      .setStyle(ButtonStyle.Primary),

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

// ================= COMMANDS =================
const commands = [
  new SlashCommandBuilder()
    .setName("oficina")
    .setDescription("🚗 Abrir OVER SPEED"),

  new SlashCommandBuilder()
    .setName("prontuario")
    .setDescription("📒 Histórico de serviços")
].map(c => c.toJSON());

// ================= REGISTER =================
async function register() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// ================= READY =================
client.once("clientReady", async () => {
  console.log(`🚗 OVER SPEED ONLINE: ${client.user.tag}`);
  await register();
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async (i) => {

  const s = session(i.user.id);

  // ================= OPEN =================
  if (i.isChatInputCommand() && i.commandName === "oficina") {

    return i.reply({
      embeds: [home(s)],
      components: [menu()],
      flags: EPHEMERAL
    });
  }

  // ================= PRONTUÁRIO =================
  if (i.isChatInputCommand() && i.commandName === "prontuario") {

    if (db.services.length === 0) {
      return i.reply({ content: "❌ Nenhum serviço encontrado", flags: EPHEMERAL });
    }

    const last = db.services.slice(-5).reverse();

    const embeds = last.map(sv =>
      new EmbedBuilder()
        .setTitle(`📒 SERVIÇO ${sv.id}`)
        .setColor(0x222222)
        .addFields(
          { name: "👤 Cliente", value: sv.client },
          { name: "🔧 Mecânico", value: sv.mechanic },
          { name: "💰 Total", value: `R$ ${sv.total}` },
          { name: "📦 Itens", value: sv.items.map(x => `${x.cat} ${x.item}`).join("\n") },
          { name: "📅 Data", value: sv.date }
        )
    );

    return i.reply({ embeds, flags: EPHEMERAL });
  }

  // ================= MENU =================
  if (i.isStringSelectMenu() && i.customId === "menu") {

    const cat = i.values[0];

    const options = Object.keys(shop[cat]).map(x => ({
      label: `${x} - R$ ${shop[cat][x]}`,
      value: `${cat}|${x}`
    }));

    return i.update({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🔧 OVER SPEED • ${cat.toUpperCase()}`)
          .setColor(0x111111)
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("item")
            .setPlaceholder("Selecionar item")
            .addOptions(options)
        ),
        buttons()
      ]
    });
  }

  // ================= ITEM =================
  if (i.isStringSelectMenu() && i.customId === "item") {

    const [cat, item] = i.values[0].split("|");

    s.items.push({ cat, item, price: price(cat, item) });

    return i.reply({ content: "✔ Modificação aplicada", flags: EPHEMERAL });
  }

  // ================= BACK =================
  if (i.customId === "back") {

    return i.update({
      embeds: [home(s)],
      components: [menu()]
    });
  }

  // ================= FULL KIT =================
  if (i.customId === "full") {

    const keys = new Set(FULL_KIT.map(x => `${x.cat}|${x.item}`));

    if (!s.full) {
      s.items.push(...FULL_KIT);
      s.full = true;
    } else {
      s.items = s.items.filter(x => !keys.has(`${x.cat}|${x.item}`));
      s.full = false;
    }

    return i.update({
      embeds: [home(s)],
      components: [menu(), buttons()]
    });
  }

  // ================= CLEAR =================
  if (i.customId === "clear") {

    s.items = [];
    s.full = false;

    return i.update({
      embeds: [home(s)],
      components: [menu(), buttons()]
    });
  }

  // ================= FINISH =================
  if (i.customId === "finish") {

    const total = s.items.reduce((a, b) => a + b.price, 0);

    const id = generateId();

    db.services.push({
      id,
      client: i.user.username,
      mechanic: i.user.username,
      items: s.items,
      total,
      date: new Date().toLocaleString("pt-BR")
    });

    s.items = [];
    s.full = false;

    return i.reply({
      content:
        `🚗 SERVIÇO FINALIZADO\n` +
        `🆔 ID: ${id}\n` +
        `💰 TOTAL: R$ ${total}`,
      flags: EPHEMERAL
    });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
