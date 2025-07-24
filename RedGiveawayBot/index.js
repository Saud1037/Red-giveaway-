// Main bot file for Red Giveaway
const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { token, prefix, redThemeColor } = require('./config.json');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent] });

client.commands = new Collection();
client.slashCommands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const giveawayPath = path.join(__dirname, 'giveaways.json');
const localesPath = path.join(__dirname, 'locales');
const serverSettings = new Map(); // For storing server-specific language settings

// Function to load translations
function getTranslation(key, lang, replacements = {}) {
    const langFilePath = path.join(localesPath, `${lang}.json`);
    if (!fs.existsSync(langFilePath)) {
        // Fallback to English if the language file doesn't exist
        const enFilePath = path.join(localesPath, 'en.json');
        const translations = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));
        let text = translations[key] || key;
        for (const placeholder in replacements) {
            text = text.replace(new RegExp(`{${placeholder}}`, 'g'), replacements[placeholder]);
        }
        return text;
    }
    const translations = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
    let text = translations[key] || key; // Fallback to key if translation not found
    for (const placeholder in replacements) {
        text = text.replace(new RegExp(`{${placeholder}}`, 'g'), replacements[placeholder]);
    }
    return text;
}

// Function to get server language, defaulting to config or 'en'
function getServerLang(guildId) {
    return serverSettings.get(guildId) || require('./config.json').defaultLang || 'en';
}

// Load commands
for (const file of commandFiles) {
    const filePath = path.join(__dirname, 'commands', file);
    const command = require(filePath);
    if (command.data && command.execute) {
        client.slashCommands.set(command.data.name, command);
        console.log(`Loaded slash command: ${command.data.name}`);
    }
    if (command.name && command.executePrefix) { // For prefix commands
        client.commands.set(command.name, command);
        console.log(`Loaded prefix command: ${command.name}`);
    }
}

// When the client is ready, run this code (only once)
client.once('ready', async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    // Register slash commands globally or for specific guilds
    // For simplicity, this example registers globally. For production, consider guild-specific registration.
    const commandsToRegister = Array.from(client.slashCommands.values()).map(cmd => cmd.data.toJSON());
    try {
        await client.application.commands.set(commandsToRegister);
        console.log('Successfully registered application (/) commands.');
    } catch (error) {
        console.error('Error registering application (/) commands:', error);
    }
    // Placeholder for checking active giveaways on startup
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        const lang = getServerLang(interaction.guildId);
        await command.execute(interaction, client, lang, getTranslation, giveawayPath, redThemeColor, serverSettings);
    } catch (error) {
        console.error(error);
        const lang = getServerLang(interaction.guildId);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: getTranslation('COMMAND_ERROR_GENERIC', lang), ephemeral: true });
        } else {
            await interaction.reply({ content: getTranslation('COMMAND_ERROR_GENERIC', lang), ephemeral: true });
        }
    }
});

// Handle prefix commands
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const serverPrefix = require('./config.json').prefix; // Using global prefix from config

    if (!message.content.startsWith(serverPrefix)) return;

    const args = message.content.slice(serverPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command || !command.executePrefix) {
        // console.log(`No prefix command matching ${commandName} was found.`);
        return; // Silently ignore if command not found for prefix
    }

    try {
        const lang = getServerLang(message.guild.id);
        await command.executePrefix(message, args, client, lang, getTranslation, giveawayPath, redThemeColor, serverSettings);
    } catch (error) {
        console.error(error);
        const lang = getServerLang(message.guild.id);
        message.reply(getTranslation('COMMAND_ERROR_GENERIC', lang));
    }
});

// Log in to Discord with your client's token
client.login(token);

