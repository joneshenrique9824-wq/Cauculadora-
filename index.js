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

// ================= CARRINHO =================
const carrinho = new Map();

// ================= PREÇOS (FULL TUNING) =================
const itens = {
  freios: { street: 10000, sport: 15000, race: 20000 },
  transmissao: { street: 10000, sport: 15000, race: 20000 },
  suspensao: { "1": 5000, "2": 10000, "3": 15000, "4": 20000 },
  blindagem: { "20": 50000, "40": 60000, "60": 70000, "80": 80000, "100": 90000 },
  motor: { street: 10000, sport: 20000, race: 30000, top: 40000 },
  turbo: { "1": 60000 },
  hidraulica: { padrao: 40000 },

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

// ================= COMANDO =================
const commands = [
  new SlashCommandBuilder()
    .setName("tuning")
    .setDescription("🚗 Painel Premium Bella Motors")
].map(c => c.toJSON());

// ================= REGISTRAR =================
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Comandos registrados!");
}

// ================= CALCULAR =================
function getPrice(cat, item) {
  return itens[cat]?.[item] || 0;
}

// ================= MENU =================
function menu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("menu")
      .setPlaceholder("🚗 Escolha uma categoria")
      .addOptions(
        { label: "Freios", value: "freios" },
        { label: "Motor", value: "motor" },
        { label: "Turbo", value: "turbo" },
        { label: "Visual", value: "visual" },
        { label: "Interior", value: "interior" },
        { label: "Vidros", value: "vidros" },
        { label: "Blindagem", value: "blindagem" }
      )
  );
}

// ================= BOTÃO FINAL =================
function finalizar() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("final")
      .setLabel("💰 FINALIZAR FULL TUNING")
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

  // OPEN PANEL
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "tuning") {

      carrinho.set(interaction.user.id, []);

      return interaction.reply({
        content: "🚗 **PAINEL PREMIUM BELLA MOTORS ABERTO**",
        components: [menu(), finalizar()],
        ephemeral: true
      });
    }
  }

  // MENU
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "menu") {
      const cat = interaction.values[0];

      const options = Object.keys(itens[cat]).map(k => ({
        label: `${k} - R$ ${itens[cat][k]}`,
        value: `${cat}|${k}`
      }));

      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("item")
          .setPlaceholder("Escolha o item")
          .addOptions(options)
      );

      return interaction.update({
        content: `🔧 Categoria: **${cat.toUpperCase()}**`,
        components: [select, finalizar()]
      });
    }

    if (interaction.customId === "item") {
      const [cat, item] = interaction.values[0].split("|");

      const cart = carrinho.get(interaction.user.id) || [];

      cart.push({
        cat,
        item,
        price: getPrice(cat, item)
      });

      carrinho.set(interaction.user.id, cart);

      const total = cart.reduce((a, b) => a + b.price, 0);

      return interaction.reply({
        content: `✔ Adicionado: **${cat} ${item}**\n💰 Total parcial: R$ ${total}`,
        ephemeral: true
      });
    }
  }

  // FINALIZAR
  if (interaction.isButton()) {
    if (interaction.customId === "final") {

      const cart = carrinho.get(interaction.user.id) || [];

      if (!cart.length) {
        return interaction.reply({
          content: "❌ Nenhum item selecionado!",
          ephemeral: true
        });
      }

      const total = cart.reduce((a, b) => a + b.price, 0);

      const embed = new EmbedBuilder()
        .setTitle("🚗 FULL TUNING - BELLA MOTORS")
        .setColor(0xff0000)
        .setDescription(
          cart.map(i =>
            `• ${i.cat} ${i.item} → R$ ${i.price}`
          ).join("\n")
        )
        .addFields(
          { name: "💰 TOTAL FINAL", value: `R$ ${total}` }
        );

      carrinho.delete(interaction.user.id);

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  }
});

// ================= LOGIN =================
client.login(TOKEN);
