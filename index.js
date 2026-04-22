import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

// ================= BOT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN?.trim();
const CLIENT_ID = process.env.CLIENT_ID?.trim();
const GUILD_ID = process.env.GUILD_ID?.trim();

// ================= DEBUG (IMPORTANTE) =================
console.log("TOKEN OK?", !!TOKEN);
console.log("CLIENT_ID OK?", !!CLIENT_ID);
console.log("GUILD_ID OK?", !!GUILD_ID);

// ================= PREÇOS =================
const itens = {
  freios: { street: 10000, sport: 15000, race: 20000 },
  transmissao: { street: 10000, sport: 15000, race: 20000 },
  suspensao: { "1": 5000, "2": 10000, "3": 15000, "4": 20000 },
  blindagem: { "20": 50000, "40": 60000, "60": 70000, "80": 80000, "100": 90000 },
  motor: { street: 10000, sport: 20000, race: 30000, top: 40000 },
  turbo: { "1": 60000 },
  hidraulica: { padrao: 40000 },

  visual: {
    buzina: 20000,
    xenon: 40000,
    neon: 30000,
    rodas: 90000,
    cor_rodas: 20000,
    acess_rodas: 4000,
    pintura_primaria: 10000,
    pintura_secundaria: 10000,
    fumaca: 30000,
    placa: 10000
  }
};

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName("calc")
    .setDescription("Calculadora Bella Motors")
    .addStringOption(opt =>
      opt.setName("itens")
        .setDescription("Ex: freios street, motor sport")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("desconto")
        .setDescription("Desconto %")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("id")
        .setDescription("ID Discord cliente")
        .setRequired(true)
    )
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

    console.log("✅ COMANDOS REGISTRADOS COM SUCESSO!");
  } catch (err) {
    console.log("❌ ERRO AO REGISTRAR:", err);
  }
}

// ================= READY =================
client.once("ready", async () => {
  console.log(`🔥 Bot online como ${client.user.tag}`);

  await registerCommands();
});

// ================= CALC =================
function getPrice(cat, item) {
  if (!itens[cat]) return 0;
  return itens[cat][item] || 0;
}

// ================= INTERAÇÃO =================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "calc") {
    const raw = interaction.options.getString("itens");
    const desconto = interaction.options.getInteger("desconto") || 0;
    const discordId = interaction.options.getString("id");

    let total = 0;

    const list = raw.toLowerCase().split(",");

    for (const item of list) {
      const parts = item.trim().split(" ");
      const cat = parts[0];
      const name = parts.slice(1).join(" ");

      total += getPrice(cat, name);
    }

    const final = total - (total * desconto / 100);

    const embed = new EmbedBuilder()
      .setTitle("🚗 Bella Motors - Calculadora")
      .setColor(0xff0000)
      .addFields(
        { name: "🆔 Cliente", value: discordId, inline: false },
        { name: "💸 Total", value: `R$ ${total.toLocaleString()}`, inline: true },
        { name: "📉 Desconto", value: `${desconto}%`, inline: true },
        { name: "💰 Final", value: `R$ ${final.toLocaleString()}`, inline: false }
      );

    await interaction.reply({ embeds: [embed] });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
