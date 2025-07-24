// /home/ubuntu/commands/glist.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

async function listGiveawaysLogic(interactionOrMessage, client, lang, getTranslation, giveawayPath, redThemeColor) {
    let giveaways = {};
    if (fs.existsSync(giveawayPath)) {
        try {
            giveaways = JSON.parse(fs.readFileSync(giveawayPath));
        } catch (err) {
            console.error("Error reading giveaways.json for glist:", err);
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

    const activeGiveaways = Object.values(giveaways).filter(gw => !gw.ended && gw.guildId === interactionOrMessage.guild.id);

    if (activeGiveaways.length === 0) {
        const noGiveawaysEmbed = new EmbedBuilder()
            .setColor(redThemeColor) // Using red for consistency, could be a neutral color too
            .setTitle(getTranslation("ACTIVE_GIVEAWAYS_TITLE", lang)) // Title can still be active giveaways
            .setDescription(getTranslation("NO_ACTIVE_GIVEAWAYS", lang))
            .setFooter({ text: getTranslation("FOOTER_TEXT", lang), iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
        if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [noGiveawaysEmbed], ephemeral: true });
        else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [noGiveawaysEmbed] });
        return;
    }

    const listEmbed = new EmbedBuilder()
        .setColor(redThemeColor)
        .setTitle(getTranslation("ACTIVE_GIVEAWAYS_TITLE", lang))
        .setFooter({ text: getTranslation("FOOTER_TEXT", lang), iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    let description = "";
    for (const gw of activeGiveaways) {
        // Make sure to use the language the giveaway was started in for its details if available
        const gwLang = gw.lang || lang;
        description += `**${gw.prize}** (ID: \`${gw.messageId}\`)\n` +
                       `${getTranslation("ENDING_IN", gwLang, { time: `<t:${Math.floor(gw.endTime / 1000)}:R>` })}\n` +
                       `${getTranslation("WINNERS_COUNT_SIMPLE", gwLang, { count: gw.winnerCount.toString() })}\n\n`;
    }
    // Discord embed description limit is 4096 characters
    listEmbed.setDescription(description.trim().substring(0, 4090)); 

    if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [listEmbed], ephemeral: true });
    else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [listEmbed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("glist")
        .setDescription("Lists all active giveaways in this server."),
    name: "glist",
    aliases: ["giveawaylist", "giveaways"],

    async execute(interaction, client, lang, getTranslation, giveawayPath, redThemeColor) {
        await listGiveawaysLogic(interaction, client, lang, getTranslation, giveawayPath, redThemeColor);
    },

    async executePrefix(message, args, client, lang, getTranslation, giveawayPath, redThemeColor) {
        await listGiveawaysLogic(message, client, lang, getTranslation, giveawayPath, redThemeColor);
    }
};
