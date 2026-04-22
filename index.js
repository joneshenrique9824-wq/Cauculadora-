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

// ================= PREÇOS MOD =================
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

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName("tuning")
    .setDescription("🚗 Painel Premium Bella Motors")
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
        { label: "Vidros", value: "vidros" }
      )
  );
}

// ================= BOTÕES PREMIUM =================
function botoes() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("full_tuning")
      .setLabel("💎 FULL TUNING AUTO")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("limpar")
      .setLabel("🧹 LIMPAR")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("finalizar")
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
        items: []
      });

      return interaction.reply({
        content: "🚗 **PAINEL BELLA MOTORS PREMIUM ABERTO**",
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
      content: `✔ Adicionado: **${cat} ${item}**\n💰 Total: R$ ${total}`,
      ephemeral: true
    });
  }

  // ================= FULL TUNING =================
  if (interaction.customId === "full_tuning") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    session.items = [];
    session.items.push(...FULL_TUNING);

    const total = session.items.reduce((a, b) => a + b.price, 0);

    return interaction.update({
      content: `💎 FULL TUNING APLICADO COM SUCESSO!\n💰 Total: R$ ${total}`,
      components: [menuPrincipal(), botoes()]
    });
  }

  // ================= LIMPAR =================
  if (interaction.customId === "limpar") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    session.items = [];

    return interaction.update({
      content: "🧹 Tudo foi limpo!",
      components: [menuPrincipal(), botoes()]
    });
  }

  // ================= FINALIZAR =================
  if (interaction.customId === "finalizar") {

    const session = sessions.get(interaction.user.id);
    if (!session || !session.items.length) {
      return interaction.reply({
        content: "❌ Nenhum item selecionado!",
        ephemeral: true
      });
    }

    const total = session.items.reduce((a, b) => a + b.price, 0);

    const full = session.items.filter(i =>
      FULL_TUNING.some(f => f.cat === i.cat && f.item === i.item)
    );

    const mods = session.items.filter(i =>
      !FULL_TUNING.some(f => f.cat === i.cat && f.item === i.item)
    );

    const embed = new EmbedBuilder()
      .setTitle("🚗 FULL TUNING PREMIUM")
      .setColor(0xff0000)
      .addFields(
        {
          name: "💎 FULL TUNING",
          value: full.length
            ? full.map(i => `• ${i.cat} ${i.item}`).join("\n")
            : "Nenhum"
        },
        {
          name: "🎨 MODIFICAÇÕES",
          value: mods.length
            ? mods.map(i => `• ${i.cat} ${i.item}`).join("\n")
            : "Nenhuma"
        },
        {
          name: "💰 TOTAL",
          value: `R$ ${total}`
        }
      );

    sessions.delete(interaction.user.id);

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
