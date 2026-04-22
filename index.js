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

// ================= SESSÕES + LOGS =================
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

// ================= PAINEL PRINCIPAL =================
function painel(session) {

  const total = session.items.reduce((a, b) => a + b.price, 0);

  return new EmbedBuilder()
    .setTitle("🚗 OVER SPEED")
    .setColor(0x111111)
    .setDescription(
      "🔧 **LS CUSTOMS • OFICINA RP PREMIUM**\n\n" +
      "💎 Sistema profissional de customização automotiva\n" +
      "⚙ Full tuning + peças individuais\n\n" +
      "🔥 Performance, estilo e precisão mecânica"
    )
    .addFields(
      {
        name: "📦 Itens",
        value: session.items.length
          ? `${session.items.length} upgrades`
          : "Nenhum item"
      },
      {
        name: "💰 Total",
        value: `R$ ${total}`
      },
      {
        name: "💎 FULL TUNING",
        value: session.fullActive ? "🟢 ATIVADO" : "🔴 DESATIVADO"
      }
    )
    .setFooter({ text: "OVER SPEED • LS Customs RP" });
}

// ================= MENU =================
function menu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("menu")
      .setPlaceholder("🔧 Selecionar categoria")
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
client.once("ready", async () => {
  console.log(`🚗 OVER SPEED ONLINE: ${client.user.tag}`);
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async interaction => {

  // ================= ABRIR =================
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "oficina") {

      sessions.set(interaction.user.id, {
        userId: interaction.user.id,
        items: [],
        fullActive: false
      });

      return interaction.reply({
        embeds: [painel({ items: [], fullActive: false })],
        components: [menu(), buttons()],
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
      embeds: [painel(session)],
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
      content: `✔ Aplicado: **${cat} ${item}**`,
      ephemeral: true
    });
  }

  // ================= FULL TUNING TOGGLE =================
  if (interaction.customId === "full") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

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
    });
  }

  // ================= LIMPAR =================
  if (interaction.customId === "clear") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    session.items = [];
    session.fullActive = false;

    return interaction.update({
      embeds: [painel(session)],
      components: [menu(), buttons()]
    });
  }

  // ================= FINALIZAR (PRONTUÁRIO + PAINEL FINAL) =================
  if (interaction.customId === "finish") {

    const session = sessions.get(interaction.user.id);

    if (!session || session.items.length === 0) {
      return interaction.reply({
        content: "❌ Nenhum serviço selecionado!",
        ephemeral: true
      });
    }

    const total = session.items.reduce((a, b) => a + b.price, 0);

    const log = addLog(session, interaction, total);

    const mecanico = {
      nome: interaction.user.username,
      id: interaction.user.id
    };

    // RESET
    sessions.set(interaction.user.id, {
      userId: interaction.user.id,
      items: [],
      fullActive: false
    });

    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚗 OVER SPEED • SERVIÇO FINALIZADO")
          .setColor(0x00ff99)
          .setDescription(
            "📒 **PRONTUÁRIO REGISTRADO COM SUCESSO**\n\n" +
            "🔧 Oficina finalizou o serviço do veículo\n" +
            "🚗 Sistema pronto para novo atendimento"
          )
          .addFields(
            { name: "👤 Cliente", value: log.clienteNome },
            { name: "🔧 Mecânico", value: `${mecanico.nome} (${mecanico.id})` },
            { name: "💰 Total", value: `R$ ${total}` }
          )
      ],
      components: [menu(), buttons()]
    });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
