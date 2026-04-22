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

// ================= LOG =================
function addLog(session, interaction, total) {
  const log = {
    clienteId: session.userId,
    clienteNome: interaction.user.username,
    mecanicoId: interaction.user.id,
    mecanicoNome: interaction.user.username,
    itens: session.items,
    total,
    data: new Date().toLocaleString("pt-BR")
  };

  logs.push(log);
  return log;
}

// ================= PAINEL =================
function painel(session) {

  const total = session.items.reduce((a, b) => a + b.price, 0);

  return new EmbedBuilder()
    .setTitle("🚗 OVER SPEED • OFICINA AUTOMOTIVA")
    .setColor(0x111111)
    .setDescription(
      "💎 Sistema profissional de customização automotiva desenvolvido para gestão completa de performance e estética veicular.\n\n" +
      "🔧 Permite aplicação de upgrades completos ou modificações individuais com cálculo automático em tempo real.\n\n" +
      "⚙️ Controle total sobre componentes e serviços mecânicos.\n\n" +
      "💎 FULL TUNING disponível para instalação completa de performance.\n\n" +
      "📊 Interface otimizada para roleplay profissional."
    )
    .addFields(
      {
        name: "📦 Itens",
        value: session.items.length ? `${session.items.length} upgrades` : "Nenhum"
      },
      {
        name: "💰 Total",
        value: `R$ ${total}`
      },
      {
        name: "💎 FULL TUNING",
        value: session.fullActive ? "🟢 ATIVO" : "🔴 OFF"
      }
    )
    .setFooter({ text: "OVER SPEED • Sistema Automotivo RP" });
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
client.once("clientReady", () => {
  console.log(`🚗 OVER SPEED ONLINE: ${client.user.tag}`);
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async interaction => {

  const session = getSession(interaction.user.id);

  // ================= OFICINA =================
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "oficina") {

      return interaction.reply({
        embeds: [painel(session)],
        components: [menu(), buttons()],
        flags: EPHEMERAL
      });
    }

    // ================= PRONTUÁRIO =================
    if (interaction.commandName === "prontuario") {

      if (!logs.length) {
        return interaction.reply({
          content: "❌ Nenhum serviço registrado",
          flags: EPHEMERAL
        });
      }

      const last = logs.slice(-5).reverse();

      return interaction.reply({
        embeds: last.map(l =>
          new EmbedBuilder()
            .setTitle("📒 PRONTUÁRIO OVER SPEED")
            .setColor(0x222222)
            .setDescription(l.itens.map(i => `• ${i.cat} ${i.item} - R$ ${i.price}`).join("\n"))
            .addFields(
              { name: "👤 Cliente", value: l.clienteNome },
              { name: "🔧 Mecânico", value: l.mecanicoNome },
              { name: "💰 Total", value: `R$ ${l.total}` },
              { name: "📅 Data", value: l.data }
            )
        ),
        flags: EPHEMERAL
      });
    }
  }

  // ================= MENU =================
  if (interaction.isStringSelectMenu() && interaction.customId === "menu") {

    const cat = interaction.values[0];

    const options = Object.keys(itens[cat]).map(i => ({
      label: `${i} - R$ ${itens[cat][i]}`,
      value: `${cat}|${i}`
    }));

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("item")
        .setPlaceholder("Escolha peça")
        .addOptions(options)
    );

    return interaction.update({
      embeds: [painel(session)],
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
      content: `✔ Aplicado: ${cat} ${item}`,
      flags: EPHEMERAL
    });
  }

  // ================= FULL TOGGLE =================
  if (interaction.customId === "full") {

    if (!session.fullActive) {
      session.items.push(...FULL_TUNING);
      session.fullActive = true;
    } else {
      session.items = session.items.filter(i =>
        !FULL_TUNING.some(f => f.cat === i.cat && f.item === i.item)
      );
      session.fullActive = false;
    }

    return interaction.update({
      embeds: [painel(session)],
      components: [menu(), buttons()]
    }).catch(() => {});
  }

  // ================= LIMPAR =================
  if (interaction.customId === "clear") {

    session.items = [];
    session.fullActive = false;

    return interaction.update({
      embeds: [painel(session)],
      components: [menu(), buttons()]
    }).catch(() => {});
  }

  // ================= FINALIZAR =================
  if (interaction.customId === "finish") {

    if (!session.items.length) {
      return interaction.reply({
        content: "❌ Nenhum serviço selecionado",
        flags: EPHEMERAL
      });
    }

    const total = session.items.reduce((a, b) => a + b.price, 0);

    addLog(session, interaction, total);

    session.items = [];
    session.fullActive = false;

    return interaction.reply({
      content: `🚗 Serviço finalizado com sucesso!\n💰 Total: R$ ${total}`,
      flags: EPHEMERAL
    });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
