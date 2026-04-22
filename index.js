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

// ================= DEBUG =================
console.log("🔐 TOKEN:", !!TOKEN);
console.log("🆔 CLIENT_ID:", !!CLIENT_ID);
console.log("🏠 GUILD_ID:", !!GUILD_ID);

// ================= CARRINHO =================
const carrinho = new Map();

// ================= PREÇOS =================
const itens = {
  freios: { street: 10000, sport: 15000, race: 20000 },
  motor: { street: 10000, sport: 20000, race: 30000, top: 40000 },
  turbo: { "1": 60000 },
  visual: {
    xenon: 40000,
    neon: 30000,
    rodas: 90000,
    pintura: 10000,
    spoiler: 20000,
    escapamento: 10000
  }
};

// ================= COMANDO =================
const commands = [
  new SlashCommandBuilder()
    .setName("oficina")
    .setDescription("🚗 Abrir oficina Bella Motors")
].map(c => c.toJSON());

// ================= REGISTRAR COMANDOS =================
async function registerCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    console.log("📡 Registrando comandos...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Comandos registrados!");
  } catch (err) {
    console.log("❌ Erro comandos:", err);
  }
}

// ================= FUNÇÕES =================
function getPrice(cat, item) {
  return itens[cat]?.[item] || 0;
}

// ================= MENUS =================
function menuCategorias() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("categoria")
      .setPlaceholder("🚗 Escolha a categoria")
      .addOptions(
        { label: "Freios", value: "freios" },
        { label: "Motor", value: "motor" },
        { label: "Turbo", value: "turbo" },
        { label: "Visual", value: "visual" }
      )
  );
}

function botaoFinalizar() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("finalizar")
      .setLabel("💰 Finalizar Orçamento")
      .setStyle(ButtonStyle.Success)
  );
}

// ================= READY =================
client.once("ready", async () => {
  console.log(`🔥 Bot online como ${client.user.tag}`);

  await registerCommands();
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async interaction => {

  // ================= COMANDO =================
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "oficina") {

      carrinho.set(interaction.user.id, []);

      return interaction.reply({
        content: "🚗 **Oficina Bella Motors aberta! Escolha as peças abaixo:**",
        components: [menuCategorias(), botaoFinalizar()],
        ephemeral: true
      });
    }
  }

  // ================= MENU =================
  if (interaction.isStringSelectMenu()) {

    // categoria
    if (interaction.customId === "categoria") {
      const cat = interaction.values[0];

      const options = Object.keys(itens[cat]).map(key => ({
        label: `${key} - R$ ${itens[cat][key]}`,
        value: `${cat}|${key}`
      }));

      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("item")
          .setPlaceholder("Escolha a peça")
          .addOptions(options)
      );

      return interaction.update({
        content: `🔧 Categoria: **${cat}**`,
        components: [menu, botaoFinalizar()]
      });
    }

    // item
    if (interaction.customId === "item") {
      const [cat, item] = interaction.values[0].split("|");

      const userCart = carrinho.get(interaction.user.id) || [];

      userCart.push({
        cat,
        item,
        price: getPrice(cat, item)
      });

      carrinho.set(interaction.user.id, userCart);

      const total = userCart.reduce((a, b) => a + b.price, 0);

      return interaction.reply({
        content: `✔ Adicionado: **${cat} ${item}**\n💰 Total: R$ ${total}`,
        ephemeral: true
      });
    }
  }

  // ================= BOTÃO FINALIZAR =================
  if (interaction.isButton()) {

    if (interaction.customId === "finalizar") {

      const userCart = carrinho.get(interaction.user.id) || [];

      if (userCart.length === 0) {
        return interaction.reply({
          content: "❌ Seu carrinho está vazio!",
          ephemeral: true
        });
      }

      const total = userCart.reduce((a, b) => a + b.price, 0);

      const embed = new EmbedBuilder()
        .setTitle("🚗 Orçamento Bella Motors")
        .setColor(0xff0000)
        .setDescription(
          userCart
            .map(i => `• ${i.cat} ${i.item} - R$ ${i.price}`)
            .join("\n")
        )
        .addFields(
          { name: "💰 Total final", value: `R$ ${total}` }
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
if (!TOKEN) {
  console.log("❌ TOKEN NÃO DEFINIDO");
} else {
  client.login(TOKEN);
}
