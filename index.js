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

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName("oficina")
    .setDescription("🚗 OVER SPEED - Oficina RP")
].map(c => c.toJSON());

// ================= REGISTRO =================
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("🚗 OVER SPEED ONLINE");
}

// ================= PAINEL =================
function painel(session) {

  const total = session.items.reduce((a, b) => a + b.price, 0);

  return new EmbedBuilder()
    .setTitle("🚗 OVER SPEED")
    .setColor(0x1f1f1f)
    .setDescription(
      "🔧 Oficina Mecânica RP Premium\n\n" +
      "💎 FULL TUNING + personalização completa\n" +
      "⚙ Sistema automático de cálculo\n\n" +
      "🚗 Performance profissional LS Customs"
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
      }
    )
    .setFooter({ text: "OVER SPEED • LS Customs RP" });
}

// ================= MENU =================
function menu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("menu")
      .setPlaceholder("🔧 Escolha categoria")
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
  await registerCommands();
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async interaction => {

  // ================= ABRIR =================
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "oficina") {

      sessions.set(interaction.user.id, {
        userId: interaction.user.id,
        items: []
      });

      return interaction.reply({
        embeds: [painel({ items: [] })],
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
      content: `✔ Adicionado: **${cat} ${item}**`,
      ephemeral: true
    });
  }

  // ================= FULL TUNING =================
  if (interaction.customId === "full") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

    session.items.push(...FULL_TUNING);

    return interaction.update({
      embeds: [painel(session)],
      components: [menu(), buttons()]
    });
  }

  // ================= HOME =================
  if (interaction.customId === "home") {

    const session = sessions.get(interaction.user.id);
    if (!session) return;

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

    return interaction.update({
      embeds: [painel(session)],
      components: [menu(), buttons()]
    });
  }

  // ================= FINALIZAR (SEGURO) =================
  if (interaction.customId === "finish") {

    const session = sessions.get(interaction.user.id);

    if (!session || session.items.length === 0) {
      return interaction.reply({
        content: "❌ Nenhum serviço selecionado!",
        ephemeral: true
      });
    }

    const total = session.items.reduce((a, b) => a + b.price, 0);

    const mecanico = {
      nome: interaction.user.username,
      id: interaction.user.id
    };

    const embed = new EmbedBuilder()
      .setTitle("🚗 OVER SPEED • SERVIÇO FINALIZADO")
      .setColor(0x00ff99)
      .setDescription(
        session.items.map(i =>
          `• ${i.cat} ${i.item} → R$ ${i.price}`
        ).join("\n")
      )
      .addFields(
        { name: "💰 TOTAL", value: `R$ ${total}` },
        { name: "🔧 MECÂNICO", value: `${mecanico.nome} (${mecanico.id})` }
      );

    // 🔥 RESET SEGURO (NÃO QUEBRA BOT)
    sessions.set(interaction.user.id, {
      userId: interaction.user.id,
      items: []
    });

    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚗 OVER SPEED")
          .setColor(0x1f1f1f)
          .setDescription(
            "✔ Serviço finalizado com sucesso!\n\n" +
            "🔧 O sistema foi resetado automaticamente\n" +
            "🚗 Pronto para novo atendimento"
          )
          .addFields(
            { name: "💰 Último serviço", value: `R$ ${total}` }
          )
      ],
      components: [menu(), buttons()]
    });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
