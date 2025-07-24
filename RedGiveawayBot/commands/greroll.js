// /home/ubuntu/commands/greroll.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

async function rerollGiveawayLogic(client, giveawayMessageId, interactionOrMessage, getTranslation, giveawayPath, redThemeColor) {
    const lang = interactionOrMessage.guild ? (client.serverSettings ? client.serverSettings.get(interactionOrMessage.guild.id) : null) || require("../config.json").defaultLang || "en" : "en";
    let giveaways = {};
    if (fs.existsSync(giveawayPath)) {
        try {
            giveaways = JSON.parse(fs.readFileSync(giveawayPath));
        } catch (err) {
            console.error("Error reading giveaways.json for greroll:", err);
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

    const langToReroll = giveawayData.lang || lang;

    if (!giveawayData.ended) {
        const notEndedEmbed = new EmbedBuilder()
            .setColor(redThemeColor)
            .setTitle(getTranslation("ERROR_TITLE", langToReroll))
            .setDescription(getTranslation("GIVEAWAY_NOT_ENDED_YET", langToReroll, { prize: `**${giveawayData.prize}**` }))
            .setTimestamp();
        if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [notEndedEmbed], ephemeral: true });
        else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [notEndedEmbed] });
        return;
    }

    const guild = await client.guilds.fetch(giveawayData.guildId).catch(console.error);
    if (!guild) return console.error(`greroll: Could not fetch guild ${giveawayData.guildId}`);
    const channel = await guild.channels.fetch(giveawayData.channelId).catch(console.error);
    if (!channel) return console.error(`greroll: Could not fetch channel ${giveawayData.channelId}`);
    const giveawayMessage = await channel.messages.fetch(giveawayData.messageId).catch(console.error);
    if (!giveawayMessage) return console.error(`greroll: Could not fetch giveaway message ${giveawayData.messageId}`);

    const reaction = giveawayMessage.reactions.cache.get("🎉");
    let allOriginalEntrants = [];
    if (reaction) {
        const users = await reaction.users.fetch();
        allOriginalEntrants = users.filter(user => !user.bot).map(user => user.id);
    }

    if (allOriginalEntrants.length === 0) {
        const noEntrantsEmbed = new EmbedBuilder()
            .setColor(redThemeColor)
            .setTitle(getTranslation("ERROR_TITLE", langToReroll))
            .setDescription(getTranslation("NO_ENTRANTS_TO_REROLL", langToReroll, { prize: `**${giveawayData.prize}**` }))
            .setTimestamp();
        if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [noEntrantsEmbed], ephemeral: true });
        else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [noEntrantsEmbed] });
        return;
    }

    const previousWinners = giveawayData.winners || [];
    let rerollPool = allOriginalEntrants.filter(id => !previousWinners.includes(id));

    if (rerollPool.length < giveawayData.winnerCount || rerollPool.length === 0) {
        rerollPool = [...allOriginalEntrants];
    }
    
    if (rerollPool.length === 0) {
        const noNewEntrantsEmbed = new EmbedBuilder()
            .setColor(redThemeColor)
            .setTitle(getTranslation("ERROR_TITLE", langToReroll))
            .setDescription(getTranslation("NO_ENTRANTS_TO_REROLL", langToReroll, { prize: `**${giveawayData.prize}**` })) // Re-using NO_ENTRANTS_TO_REROLL as it fits
            .setTimestamp();
        if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [noNewEntrantsEmbed], ephemeral: true });
        else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [noNewEntrantsEmbed] });
        return;
    }

    let newWinners = [];
    const numWinnersToPick = Math.min(giveawayData.winnerCount, rerollPool.length);

    for (let i = 0; i < numWinnersToPick; i++) {
        const randomIndex = Math.floor(Math.random() * rerollPool.length);
        newWinners.push(rerollPool.splice(randomIndex, 1)[0]);
    }

    if (newWinners.length > 0) {
        giveaways[giveawayData.messageId].winners = newWinners;
        giveaways[giveawayData.messageId].rerolledAt = Date.now();
        fs.writeFileSync(giveawayPath, JSON.stringify(giveaways, null, 4));

        const winnerMentions = newWinners.map(id => `<@${id}>`).join(", ");
        const rerollAnnouncementEmbed = new EmbedBuilder()
            .setColor(redThemeColor)
            .setTitle(getTranslation("GIVEAWAY_REROLLED_TITLE", langToReroll))
            .setDescription(getTranslation("NEW_WINNER_ANNOUNCEMENT_REROLL", langToReroll, { prize: `**${giveawayData.prize}**`, winners: winnerMentions }))
            .setFooter({ text: getTranslation("FOOTER_TEXT", langToReroll), iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
        
        await channel.send({ content: getTranslation("NEW_WINNER_ANNOUNCEMENT", langToReroll, { prize: `**${giveawayData.prize}**`, winners: winnerMentions }), embeds: [rerollAnnouncementEmbed] });
        
        const successEmbed = new EmbedBuilder()
            .setColor(redThemeColor)
            .setTitle(getTranslation("SUCCESS_TITLE", langToReroll))
            .setDescription(getTranslation("GIVEAWAY_REROLLED_SUCCESS", langToReroll, { prize: `**${giveawayData.prize}**` }))
            .setTimestamp();
        if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [successEmbed], ephemeral: true });

    } else {
        const noNewWinnersEmbed = new EmbedBuilder()
            .setColor(redThemeColor)
            .setTitle(getTranslation("ERROR_TITLE", langToReroll))
            .setDescription(getTranslation("NO_NEW_WINNERS_REROLL", langToReroll, { prize: `**${giveawayData.prize}**` }))
            .setTimestamp();
        if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [noNewWinnersEmbed], ephemeral: true });
        else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [noNewWinnersEmbed] });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("greroll")
        .setDescription("Rerolls winners for a giveaway.")
        .addStringOption(option =>
            option.setName("message_id")
                .setDescription("The message ID of the giveaway to reroll")
                .setRequired(true)),
    name: "greroll",
    aliases: ["giveawayreroll"],

    async execute(interaction, client, lang, getTranslation, giveawayPath, redThemeColor) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const permEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("PERM_ERROR_TITLE", lang))
                .setDescription(getTranslation("PERM_ERROR_GIVEAWAY_REROLL", lang))
                .setTimestamp();
            return interaction.reply({ embeds: [permEmbed], ephemeral: true });
        }
        const messageId = interaction.options.getString("message_id");
        await rerollGiveawayLogic(client, messageId, interaction, getTranslation, giveawayPath, redThemeColor);
    },

    async executePrefix(message, args, client, lang, getTranslation, giveawayPath, redThemeColor) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const permEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("PERM_ERROR_TITLE", lang))
                .setDescription(getTranslation("PERM_ERROR_GIVEAWAY_REROLL", lang))
                .setTimestamp();
            return message.reply({ embeds: [permEmbed] });
        }
        if (args.length < 1) {
            const usageEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("USAGE_ERROR_TITLE", lang))
                .setDescription(getTranslation("USAGE_ERROR_GREROLL", lang, { prefix: client.config.prefix }))
                .setTimestamp();
            return message.reply({ embeds: [usageEmbed] });
        }
        const messageId = args[0];
        await rerollGiveawayLogic(client, messageId, message, getTranslation, giveawayPath, redThemeColor);
    }
};
