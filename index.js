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

// ================= FULL TUNING =================
const FULL_TUNING = [
  { cat: "freios", item: "race", price: 20000 },
  { cat: "transmissao", item: "race", price: 20000 },
  { cat: "suspensao", item: "4", price: 20000 },
  { cat: "motor", item: "top", price: 40000 },
  { cat: "turbo", item: "1", price: 60000 },
  { cat: "hidraulica", item: "padrao", price: 40000 }
];

// ================= PREÇOS =================
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
  },

  vidros: {
    fume100: 40000,
    fume70: 40000
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
    .setDescription("🚗 Oficina RP Premium")
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

// ================= PAINEL =================
function painel() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("menu")
      .setPlaceholder("🚗 Abrir Oficina Premium")
      .addOptions(
        { label: "🔧 Motor", value: "motor" },
        { label: "🎨 Visual", value: "visual" },
        { label: "🪑 Interior", value: "interior" },
        { label: "🛞 Freios", value: "freios" },
        { label: "⚙ Transmissão", value: "transmissao" }
      )
  );
}

// ================= BOTÕES =================
function botoes() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("full")
      .setLabel("💎 FULL TUNING")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("back")
      .setLabel("⬅ VOLTAR")
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

// ================= INTERAÇÃO =================
client.on("interactionCreate", async interaction => {

  // ================= ABRIR =================
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "tuning") {

      sessions.set(interaction.user.id, {
        userId: interaction.user.id,
        items: [],
        page: "home"
      });

      return interaction.reply({
        content: "🚗 **OFICINA RP PREMIUM ABERTA**",
        components: [painel(), botoes()],
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
        .setPlaceholder("🔧 Escolha a peça")
        .addOptions(options)
    );

    session.page = cat;

    return interaction.update({
      content: `🔧 Categoria: **${cat.toUpperCase()}**`,
      components: [select, botoes()]
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
      content: `✔ Adicionado: **${cat} ${item}**\n💰 Total: R$ ${total}`,
      ephemeral: true
    });
  }

  // ================= FULL TUNING (BASE + LIBERADO) =================
  if (interaction.customId === "full") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    session.items.push(...FULL_TUNING);

    const total = session.items.reduce((a, b) => a + b.price, 0);

    return interaction.update({
      content:
        `💎 FULL TUNING ATIVADO\n` +
        `✔ Base instalada\n` +
        `➕ Você ainda pode adicionar peças\n` +
        `💰 Total: R$ ${total}`,
      components: [painel(), botoes()]
    });
  }

  // ================= VOLTAR =================
  if (interaction.customId === "back") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    return interaction.update({
      content: "🚗 **PAINEL PRINCIPAL**",
      components: [painel(), botoes()]
    });
  }

  // ================= LIMPAR =================
  if (interaction.customId === "clear") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    session.items = [];

    return interaction.update({
      content: "🧹 Carrinho limpo!",
      components: [painel(), botoes()]
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
      .setColor(0x00ff00)
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
