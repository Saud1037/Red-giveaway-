// /home/ubuntu/commands/setlang.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

function setServerLanguage(guildId, lang, serverSettings) {
    serverSettings.set(guildId, lang);
    // In a production bot, you would save this to a persistent store (e.g., database or a JSON file for server configs)
    // For example:
    // const serverConfigsPath = path.join(__dirname, "../server_configs.json");
    // let configs = {};
    // if (fs.existsSync(serverConfigsPath)) { configs = JSON.parse(fs.readFileSync(serverConfigsPath, "utf-8")); }
    // configs[guildId] = { lang: lang };
    // fs.writeFileSync(serverConfigsPath, JSON.stringify(configs, null, 4));
    console.log(`Language for guild ${guildId} set to ${lang}`);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setlang")
        .setDescription("Sets the bot's language for this server.")
        .addStringOption(option =>
            option.setName("language")
                .setDescription("The language to set (e.g., en, ar)")
                .setRequired(true)
                .addChoices(
                    { name: "English", value: "en" },
                    { name: "العربية (Arabic)", value: "ar" }
                )),
    name: "setlang",
    aliases: ["language", "lang"],

    async execute(interaction, client, lang, getTranslation, giveawayPath, redThemeColor, serverSettings) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const permEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("PERM_ERROR_TITLE", lang))
                .setDescription(getTranslation("PERM_ERROR_SETLANG", lang))
                .setTimestamp();
            return interaction.reply({ embeds: [permEmbed], ephemeral: true });
        }

        const targetLang = interaction.options.getString("language");

        if (targetLang === "en" || targetLang === "ar") {
            setServerLanguage(interaction.guildId, targetLang, serverSettings);
            const successEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("SUCCESS_TITLE", targetLang)) // Use targetLang for the success message
                .setDescription(getTranslation("SETLANG_SUCCESS", targetLang, { language: targetLang === "en" ? "English" : "العربية" }))
                .setTimestamp();
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } else {
            // This path is less likely with slash command choices but good for robustness / prefix
            const failEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("ERROR_TITLE", lang)) // Use current lang for fail message
                .setDescription(getTranslation("SETLANG_FAIL", lang))
                .setTimestamp();
            await interaction.reply({ embeds: [failEmbed], ephemeral: true });
        }
    },

    async executePrefix(message, args, client, lang, getTranslation, giveawayPath, redThemeColor, serverSettings) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const permEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("PERM_ERROR_TITLE", lang))
                .setDescription(getTranslation("PERM_ERROR_SETLANG", lang))
                .setTimestamp();
            return message.reply({ embeds: [permEmbed] });
        }

        if (args.length < 1) {
            const usageEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("USAGE_ERROR_TITLE", lang))
                .setDescription(getTranslation("USAGE_ERROR_SETLANG", lang, { prefix: client.config.prefix }))
                .setTimestamp();
            return message.reply({ embeds: [usageEmbed] });
        }

        const targetLang = args[0].toLowerCase();

        if (targetLang === "en" || targetLang === "ar") {
            setServerLanguage(message.guild.id, targetLang, serverSettings);
            const successEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("SUCCESS_TITLE", targetLang)) // Use targetLang for the success message
                .setDescription(getTranslation("SETLANG_SUCCESS", targetLang, { language: targetLang === "en" ? "English" : "العربية" }))
                .setTimestamp();
            await message.reply({ embeds: [successEmbed] });
        } else {
            const failEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("ERROR_TITLE", lang))
                .setDescription(getTranslation("SETLANG_FAIL", lang))
                .setTimestamp();
            await message.reply({ embeds: [failEmbed] });
        }
    }
};
