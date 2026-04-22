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

// ================= DATABASE SIMULADA =================
const db = {
  services: [],
  users: new Map()
};

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
const sessions = new Map();

function session(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      id,
      items: [],
      full: false,
      page: "home"
    });
  }
  return sessions.get(id);
}

// ================= PRICE =================
const price = (c, i) => shop[c]?.[i] || 0;

// ================= SERVICE ID =================
function generateServiceId() {
  return `OS-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

// ================= HOME PANEL =================
function homePanel(s) {

  const total = s.items.reduce((a, b) => a + b.price, 0);

  return new EmbedBuilder()
    .setTitle("🚗 OVER SPEED • ENTERPRISE GARAGE")
    .setColor(0x0a0a0a)
    .setDescription(
      "💎 **SISTEMA ENTERPRISE DE OFICINA RP**\n\n" +
      "🔧 Gerenciamento profissional de modificações\n" +
      "⚙ Controle completo de performance veicular\n" +
      "📊 Sistema de serviço com rastreio único\n\n" +
      "🚀 Pronto para servidores RP grandes"
    )
    .addFields(
      { name: "📦 ITENS", value: `${s.items.length}`, inline: true },
      { name: "💰 TOTAL", value: `R$ ${total}`, inline: true },
      { name: "💎 FULL KIT", value: s.full ? "ATIVO 🟢" : "OFF 🔴", inline: true }
    )
    .setFooter({ text: "OVER SPEED ENTERPRISE SYSTEM" });
}

// ================= MENU =================
function menu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("menu")
      .setPlaceholder("🚗 Selecionar categoria")
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
    new ButtonBuilder().setCustomId("finish").setLabel("💰 FINALIZAR SERVIÇO").setStyle(ButtonStyle.Success)
  );
}

// ================= REGISTER COMMANDS =================
const commands = [
  new SlashCommandBuilder().setName("oficina").setDescription("🚗 Abrir OVER SPEED"),
  new SlashCommandBuilder().setName("prontuario").setDescription("📒 Histórico da oficina")
].map(c => c.toJSON());

async function register() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// ================= READY =================
client.once("clientReady", async () => {
  console.log(`🚗 OVER SPEED ENTERPRISE ONLINE: ${client.user.tag}`);
  await register();
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async (i) => {

  const s = session(i.user.id);

  // ================= OPEN =================
  if (i.isChatInputCommand() && i.commandName === "oficina") {

    return i.reply({
      embeds: [homePanel(s)],
      components: [menu()],
      flags: EPHEMERAL
    });
  }

  // ================= PRONTUÁRIO ENTERPRISE =================
  if (i.isChatInputCommand() && i.commandName === "prontuario") {

    if (db.services.length === 0) {
      return i.reply({ content: "❌ Nenhum serviço registrado", flags: EPHEMERAL });
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
          .setTitle(`🔧 CAT: ${cat.toUpperCase()}`)
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

    return i.reply({ content: "✔ Adicionado ao serviço", flags: EPHEMERAL });
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

    return i.update({ embeds: [homePanel(s)], components: [menu()] });
  }

  // ================= CLEAR =================
  if (i.customId === "clear") {

    s.items = [];
    s.full = false;

    return i.update({ embeds: [homePanel(s)], components: [menu()] });
  }

  // ================= FINALIZAR (ENTERPRISE SERVICE) =================
  if (i.customId === "finish") {

    const total = s.items.reduce((a, b) => a + b.price, 0);

    const serviceId = generateServiceId();

    db.services.push({
      id: serviceId,
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
        `🆔 ID: ${serviceId}\n` +
        `💰 TOTAL: R$ ${total}`,
      flags: EPHEMERAL
    });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
