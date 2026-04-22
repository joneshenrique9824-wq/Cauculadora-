import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

// ================= CONFIG =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Falta TOKEN, CLIENT_ID ou GUILD_ID no .env");
  process.exit(1);
}

// ================= TABELA =================
const itens = {
  freios: { street: 10000, sport: 15000, race: 20000 },
  transmissao: { street: 10000, sport: 15000, race: 20000 },
  suspensao: { "1": 5000, "2": 10000, "3": 15000, "4": 20000 },
  blindagem: { "20": 50000, "40": 60000, "60": 70000, "80": 80000, "100": 90000 },
  motor: { street: 10000, sport: 20000, race: 30000, top: 40000 },
  turbo: { "1": 60000 },
  hidraulica: { padrao: 40000 },
  visual: { rodas: 90000, neon: 30000, xenon: 40000 },
  interior: { banco: 30000, volante: 35000, som: 30000 }
};

// ================= COMANDO =================
const commands = [
  new SlashCommandBuilder()
    .setName("calc")
    .setDescription("Abrir calculadora Bella Motors")
].map(c => c.toJSON());

// ================= REGISTRO =================
const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registerCommands() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados!");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
  }
}

// ================= PREÇO =================
function getPrice(cat, item) {
  if (!itens[cat]) return 0;
  return itens[cat][item] || 0;
}

// ================= READY =================
client.once("ready", async () => {
  console.log(`🔥 Bot online como ${client.user.tag}`);
  await registerCommands();
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async interaction => {

  // ================= /calc abre modal =================
  if (interaction.isChatInputCommand() && interaction.commandName === "calc") {

    const modal = new ModalBuilder()
      .setCustomId("calc_modal")
      .setTitle("🚗 Bella Motors - Calculadora");

    const itensInput = new TextInputBuilder()
      .setCustomId("itens")
      .setLabel("Itens (freios street, motor sport...)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const descontoInput = new TextInputBuilder()
      .setCustomId("desconto")
      .setLabel("Desconto % (opcional)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const idInput = new TextInputBuilder()
      .setCustomId("discordId")
      .setLabel("ID do cliente")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(itensInput),
      new ActionRowBuilder().addComponents(descontoInput),
      new ActionRowBuilder().addComponents(idInput)
    );

    return interaction.showModal(modal);
  }

  // ================= PROCESSAR MODAL =================
  if (interaction.isModalSubmit() && interaction.customId === "calc_modal") {

    const raw = interaction.fields.getTextInputValue("itens");
    const desconto = Number(interaction.fields.getTextInputValue("desconto")) || 0;
    const discordId = interaction.fields.getTextInputValue("discordId");

    let total = 0;

    const list = raw.split(",");

    for (const item of list) {
      const clean = item.trim().toLowerCase();

      const spaceIndex = clean.indexOf(" ");
      if (spaceIndex === -1) continue;

      const cat = clean.slice(0, spaceIndex);
      const name = clean.slice(spaceIndex + 1);

      const price = getPrice(cat, name);

      if (price) total += price;
    }

    const final = total - (total * desconto / 100);

    const format = (v) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
      }).format(v);

    // ================= BOTÕES =================
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirmar")
        .setLabel("✔ Confirmar")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("cancelar")
        .setLabel("❌ Cancelar")
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle("🚗 Bella Motors - Orçamento")
      .setColor(0xff0000)
      .addFields(
        { name: "🆔 Cliente", value: discordId },
        { name: "💸 Total", value: format(total), inline: true },
        { name: "📉 Desconto", value: `${desconto}%`, inline: true },
        { name: "💰 Final", value: format(final), inline: false }
      )
      .setFooter({ text: "Clique para confirmar ou cancelar" });

    return interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }

  // ================= BOTÕES =================
  if (interaction.isButton()) {

    if (interaction.customId === "confirmar") {
      return interaction.reply({
        content: "✅ Orçamento confirmado com sucesso!",
        ephemeral: true
      });
    }

    if (interaction.customId === "cancelar") {
      return interaction.reply({
        content: "❌ Orçamento cancelado.",
        ephemeral: true
      });
    }
  }
});

// ================= LOGIN =================
client.login(TOKEN);
