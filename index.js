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

// ================= DB =================
const db = { services: [] };

// ================= SESSION =================
const sessions = new Map();
function session(id) {
  if (!sessions.has(id)) {
    sessions.set(id, { id, items: [], full: false });
  }
  return sessions.get(id);
}

// ================= SHOP =================
const shop = {
  freios: { street: 10000, sport: 15000, race: 20000 },
  transmissao: { street: 10000, sport: 15000, race: 20000 },
  suspensao: { "1": 5000, "2": 10000, "3": 15000, "4": 20000 },
  motor: { street: 10000, sport: 20000, race: 30000, top: 40000 },
  turbo: { "1": 60000 },
  hidraulica: { padrao: 40000 },

  blindagem: { "20": 50000, "40": 60000, "60": 70000, "80": 80000, "100": 90000 },
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

const price = (c, i) => shop[c]?.[i] || 0;

// ================= FULL KIT =================
const FULL_KIT = [
  { cat: "freios", item: "race", price: 20000 },
  { cat: "transmissao", item: "race", price: 20000 },
  { cat: "suspensao", item: "4", price: 20000 },
  { cat: "motor", item: "top", price: 40000 },
  { cat: "turbo", item: "1", price: 60000 },
  { cat: "hidraulica", item: "padrao", price: 40000 }
];

// ================= UTILS =================
function generateId() {
  return `OS-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

function formatItems(items) {
  if (!items.length) return "Nenhum item selecionado";
  return items.map(i =>
    `🔧 ${i.cat.toUpperCase()} • ${i.item} — R$ ${i.price}`
  ).join("\n");
}

// ================= HOME =================
function home(s) {
  const total = s.items.reduce((a, b) => a + b.price, 0);

  return new EmbedBuilder()
    .setTitle("🚗 OVER SPEED • GARAGEM")
    .setColor(0x00ffcc)
    .setDescription("Sistema profissional de tuning RP")
    .addFields(
      { name: "📦 ITENS", value: formatItems(s.items) },
      { name: "💰 TOTAL", value: `R$ ${total}`, inline: true },
      { name: "💎 FULL KIT", value: s.full ? "ON 🟢" : "OFF 🔴", inline: true }
    )
    .setFooter({ text: "OVER SPEED SYSTEM" })
    .setTimestamp();
}

// ================= MENU =================
function menu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("menu")
      .setPlaceholder("Selecionar categoria")
      .addOptions(
        { label: "Motor", value: "motor" },
        { label: "Freios", value: "freios" },
        { label: "Transmissão", value: "transmissao" },
        { label: "Suspensão", value: "suspensao" },
        { label: "Turbo", value: "turbo" },
        { label: "Hidráulica", value: "hidraulica" },
        { label: "Blindagem", value: "blindagem" },
        { label: "Visual", value: "visual" },
        { label: "Interior", value: "interior" },
        { label: "Vidros", value: "vidros" }
      )
  );
}

// ================= BUTTONS =================
function buttons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("back").setLabel("⬅ Voltar").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("full").setLabel("💎 Full Kit").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("clear").setLabel("🧹 Limpar").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("finish").setLabel("💰 Finalizar").setStyle(ButtonStyle.Success)
  );
}

// ================= COMMANDS =================
const commands = [
  new SlashCommandBuilder().setName("oficina").setDescription("Abrir OVER SPEED"),
  new SlashCommandBuilder().setName("prontuario").setDescription("Histórico de serviços")
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

  // OPEN
  if (i.isChatInputCommand() && i.commandName === "oficina") {
    return i.reply({
      embeds: [home(s)],
      components: [menu()]
    });
  }

  // PRONTUARIO
  if (i.isChatInputCommand() && i.commandName === "prontuario") {

    if (!db.services.length) {
      return i.reply({
        content: "❌ Nenhum serviço registrado.",
        flags: EPHEMERAL
      });
    }

    const last = db.services.slice(-5).reverse();

    const embeds = last.map(sv =>
      new EmbedBuilder()
        .setTitle(`📒 SERVIÇO ${sv.id}`)
        .setColor(0x111111)
        .setDescription(
          `👨‍🔧 Mecânico: ${sv.mechanicName}\n` +
          `🪪 ID: ${sv.mechanicId}\n\n` +
          `🔧 Peças:\n${sv.items}\n\n` +
          `💰 Total: R$ ${sv.total}\n` +
          `📅 ${sv.date}`
        )
    );

    return i.reply({ embeds, flags: EPHEMERAL });
  }

  // MENU
  if (i.isStringSelectMenu() && i.customId === "menu") {

    const cat = i.values[0];

    const options = Object.keys(shop[cat]).map(x => ({
      label: `${x} - R$ ${shop[cat][x]}`,
      value: `${cat}|${x}`
    }));

    return i.update({
      embeds: [new EmbedBuilder().setTitle(`🔧 ${cat.toUpperCase()}`)],
      components: [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("item")
            .addOptions(options)
        ),
        buttons()
      ]
    });
  }

  // ITEM
  if (i.isStringSelectMenu() && i.customId === "item") {

    const [cat, item] = i.values[0].split("|");

    s.items.push({ cat, item, price: price(cat, item) });

    return i.update({
      embeds: [home(s)],
      components: [menu(), buttons()]
    });
  }

  // BACK
  if (i.customId === "back") {
    return i.update({
      embeds: [home(s)],
      components: [menu()]
    });
  }

  // FULL
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

  // CLEAR
  if (i.customId === "clear") {
    s.items = [];
    s.full = false;

    return i.update({
      embeds: [home(s)],
      components: [menu(), buttons()]
    });
  }

  // FINISH
  if (i.customId === "finish") {

    if (!s.items.length) {
      return i.reply({
        content: "❌ Nenhuma modificação aplicada!",
        flags: EPHEMERAL
      });
    }

    const total = s.items.reduce((a, b) => a + b.price, 0);
    const id = generateId();

    const mechanicName = i.user.username;
    const mechanicId = i.user.id;

    const itemsText = formatItems(s.items);
    const date = new Date().toLocaleString("pt-BR");

    db.services.push({
      id,
      mechanicName,
      mechanicId,
      items: itemsText,
      total,
      date
    });

    const embed = new EmbedBuilder()
      .setTitle("📒 ORDEM DE SERVIÇO FINALIZADA")
      .setColor(0x00ffcc)
      .setDescription(
        `🆔 ${id}\n` +
        `👨‍🔧 ${mechanicName}\n` +
        `🪪 ${mechanicId}\n\n` +
        `${itemsText}\n\n` +
        `💰 R$ ${total}\n` +
        `📅 ${date}`
      );

    s.items = [];
    s.full = false;

    return i.reply({
      embeds: [embed],
      flags: EPHEMERAL
    });
  }

});

client.login(TOKEN);
