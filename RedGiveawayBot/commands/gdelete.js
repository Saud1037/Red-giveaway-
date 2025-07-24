// /home/ubuntu/commands/gdelete.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

async function deleteGiveawayLogic(client, giveawayMessageId, interactionOrMessage, getTranslation, giveawayPath, redThemeColor) {
    const lang = interactionOrMessage.guild ? (client.serverSettings ? client.serverSettings.get(interactionOrMessage.guild.id) : null) || require("../config.json").defaultLang || "en" : "en";
    let giveaways = {};
    if (fs.existsSync(giveawayPath)) {
        try {
            giveaways = JSON.parse(fs.readFileSync(giveawayPath));
        } catch (err) {
            console.error("Error reading giveaways.json for gdelete:", err);
            const errorEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("ERROR_TITLE", lang))
                .setDescription(getTranslation("COMMAND_ERROR_GENERIC", lang))
                .setTimestamp();
            if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [errorEmbed], ephemeral: true });
            else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [errorEmbed] });
            return;
        }
    }

    const giveawayData = Object.values(giveaways).find(gw => gw.messageId === giveawayMessageId);

    if (!giveawayData) {
        const notFoundEmbed = new EmbedBuilder()
            .setColor(redThemeColor)
            .setTitle(getTranslation("ERROR_TITLE", lang))
            .setDescription(getTranslation("GIVEAWAY_NOT_FOUND", lang))
            .setTimestamp();
        if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [notFoundEmbed], ephemeral: true });
        else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [notFoundEmbed] });
        return;
    }

    try {
        const guild = await client.guilds.fetch(giveawayData.guildId).catch(console.error);
        if (guild) {
            const channel = await guild.channels.fetch(giveawayData.channelId).catch(console.error);
            if (channel) {
                const giveawayMessage = await channel.messages.fetch(giveawayData.messageId).catch(() => null);
                if (giveawayMessage) {
                    await giveawayMessage.delete();
                }
            }
        }
    } catch (err) {
        console.warn(`Could not delete giveaway message ${giveawayData.messageId} from Discord:`, err.message);
    }

    delete giveaways[giveawayData.messageId];
    fs.writeFileSync(giveawayPath, JSON.stringify(giveaways, null, 4));

    const langToDelete = giveawayData.lang || lang;
    const successEmbed = new EmbedBuilder()
        .setColor(redThemeColor)
        .setTitle(getTranslation("SUCCESS_TITLE", langToDelete))
        .setDescription(getTranslation("GIVEAWAY_DELETED", langToDelete, { prize: `**${giveawayData.prize}**` }))
        .setTimestamp();

    if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [successEmbed], ephemeral: true });
    // For prefix, if a public confirmation is desired, remove ephemeral: true or send to channel.
    // User asked for minimal files, so keeping ephemeral for prefix command success for now.
    else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [successEmbed] }); 
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("gdelete")
        .setDescription("Deletes a giveaway.")
        .addStringOption(option =>
            option.setName("message_id")
                .setDescription("The message ID of the giveaway to delete")
                .setRequired(true)),
    name: "gdelete",
    aliases: ["giveawaydelete"],

    async execute(interaction, client, lang, getTranslation, giveawayPath, redThemeColor) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const permEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("PERM_ERROR_TITLE", lang))
                .setDescription(getTranslation("PERM_ERROR_GIVEAWAY_DELETE", lang))
                .setTimestamp();
            return interaction.reply({ embeds: [permEmbed], ephemeral: true });
        }
        const messageId = interaction.options.getString("message_id");
        await deleteGiveawayLogic(client, messageId, interaction, getTranslation, giveawayPath, redThemeColor);
    },

    async executePrefix(message, args, client, lang, getTranslation, giveawayPath, redThemeColor) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const permEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("PERM_ERROR_TITLE", lang))
                .setDescription(getTranslation("PERM_ERROR_GIVEAWAY_DELETE", lang))
                .setTimestamp();
            return message.reply({ embeds: [permEmbed] }); // Prefix commands reply directly
        }
        if (args.length < 1) {
            const usageEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("USAGE_ERROR_TITLE", lang))
                .setDescription(getTranslation("USAGE_ERROR_GDELETE", lang, { prefix: client.config.prefix }))
                .setTimestamp();
            return message.reply({ embeds: [usageEmbed] });
        }
        const messageId = args[0];
        await deleteGiveawayLogic(client, messageId, message, getTranslation, giveawayPath, redThemeColor);
    }
};
