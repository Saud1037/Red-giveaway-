// /home/ubuntu/commands/gend.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

async function endGiveawayLogic(client, giveawayMessageId, interactionOrMessage, getTranslation, giveawayPath, redThemeColor, isAutoEnd = false) {
    const langForInitialError = interactionOrMessage && interactionOrMessage.guild ? (client.serverSettings ? client.serverSettings.get(interactionOrMessage.guild.id) : null) || require("../config.json").defaultLang || "en" : "en";
    let giveaways = {};
    if (fs.existsSync(giveawayPath)) {
        try {
            giveaways = JSON.parse(fs.readFileSync(giveawayPath));
        } catch (err) {
            console.error("Error reading giveaways.json for gend:", err);
            if (interactionOrMessage && !isAutoEnd) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(redThemeColor)
                    .setTitle(getTranslation("ERROR_TITLE", langForInitialError))
                    .setDescription(getTranslation("COMMAND_ERROR_GENERIC", langForInitialError))
                    .setTimestamp();
                if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [errorEmbed], ephemeral: true });
                else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [errorEmbed] });
            }
            return;
        }
    }

    const giveawayData = Object.values(giveaways).find(gw => gw.messageId === giveawayMessageId);

    if (!giveawayData) {
        if (interactionOrMessage && !isAutoEnd) {
            const notFoundEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("ERROR_TITLE", langForInitialError))
                .setDescription(getTranslation("GIVEAWAY_NOT_FOUND", langForInitialError))
                .setTimestamp();
            if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [notFoundEmbed], ephemeral: true });
            else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [notFoundEmbed] });
        }
        return;
    }

    const langToEnd = giveawayData.lang || langForInitialError;

    if (giveawayData.ended && !isAutoEnd) {
        if (interactionOrMessage) {
            const alreadyEndedEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("ERROR_TITLE", langToEnd))
                .setDescription(getTranslation("GIVEAWAY_ALREADY_ENDED", langToEnd))
                .setTimestamp();
            if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [alreadyEndedEmbed], ephemeral: true });
            else if (interactionOrMessage.channel) await interactionOrMessage.channel.send({ embeds: [alreadyEndedEmbed] });
        }
        return;
    }

    const guild = await client.guilds.fetch(giveawayData.guildId).catch(console.error);
    if (!guild) return console.error(`gend: Could not fetch guild ${giveawayData.guildId}`);
    const channel = await guild.channels.fetch(giveawayData.channelId).catch(console.error);
    if (!channel) return console.error(`gend: Could not fetch channel ${giveawayData.channelId}`);
    const giveawayMessage = await channel.messages.fetch(giveawayData.messageId).catch(console.error);
    if (!giveawayMessage) return console.error(`gend: Could not fetch giveaway message ${giveawayData.messageId}`);

    const reaction = giveawayMessage.reactions.cache.get("🎉");
    let entrants = [];
    if (reaction) {
        const users = await reaction.users.fetch();
        entrants = users.filter(user => !user.bot).map(user => user.id);
    }

    let winners = [];
    if (entrants.length > 0) {
        for (let i = 0; i < giveawayData.winnerCount; i++) {
            if (entrants.length === 0) break;
            const randomIndex = Math.floor(Math.random() * entrants.length);
            winners.push(entrants.splice(randomIndex, 1)[0]);
        }
    }

    giveaways[giveawayData.messageId].ended = true;
    giveaways[giveawayData.messageId].winners = winners;
    giveaways[giveawayData.messageId].endedAt = Date.now();
    fs.writeFileSync(giveawayPath, JSON.stringify(giveaways, null, 4));

    const endAnnouncementEmbed = new EmbedBuilder()
        .setColor(redThemeColor)
        .setTitle(getTranslation("GIVEAWAY_ENDED_TIME_UP", langToEnd, { prize: giveawayData.prize }))
        .setDescription(
            `${getTranslation("PRIZE_LABEL", langToEnd, { prize: `**${giveawayData.prize}**` })}\n` +
            `${getTranslation("HOSTED_BY", langToEnd, { user: `<@${giveawayData.hostId}>` })}\n` +
            `${getTranslation("ENDED_AT_LABEL", langToEnd, { time: `<t:${Math.floor(Date.now() / 1000)}:F>` })}`
        )
        .setFooter({ text: getTranslation("FOOTER_TEXT", langToEnd), iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    let announcementContent;
    if (winners.length > 0) {
        const winnerMentions = winners.map(id => `<@${id}>`).join(", ");
        endAnnouncementEmbed.addFields({ name: getTranslation("WINNERS_ANNOUNCEMENT_LABEL", langToEnd), value: winnerMentions });
        announcementContent = getTranslation("NEW_WINNER_ANNOUNCEMENT", langToEnd, { prize: `**${giveawayData.prize}**`, winners: winnerMentions });
    } else {
        endAnnouncementEmbed.addFields({ name: getTranslation("WINNERS_ANNOUNCEMENT_LABEL", langToEnd), value: getTranslation("NO_VALID_ENTRANTS_FOR_WINNER_SELECTION", langToEnd) });
        announcementContent = getTranslation("NO_VALID_ENTRANTS", langToEnd, { prize: `**${giveawayData.prize}**` });
    }
    await channel.send({ content: announcementContent, embeds: [endAnnouncementEmbed] });

    const originalEmbed = EmbedBuilder.from(giveawayMessage.embeds[0]);
    originalEmbed.setColor(redThemeColor); // Ensure original embed also gets the red theme
    originalEmbed.setTitle(getTranslation("GIVEAWAY_ENDED_TITLE", langToEnd));
    originalEmbed.setDescription(
        `${getTranslation("PRIZE_LABEL", langToEnd, { prize: `**${giveawayData.prize}**` })}\n` +
        `${getTranslation("ENDED_MESSAGE", langToEnd)}\n` +
        `${getTranslation("HOSTED_BY", langToEnd, { user: `<@${giveawayData.hostId}>` })}\n` +
        `${getTranslation("WINNERS_COUNT", langToEnd, { count: giveawayData.winnerCount.toString() })} • ${getTranslation("ENDED_AT", langToEnd, { time: `<t:${Math.floor(Date.now() / 1000)}:R>` })}`
    );
    originalEmbed.setTimestamp(Date.now());
    originalEmbed.setFields([]); // Clear old fields like "Ending In"
    originalEmbed.addFields({ name: getTranslation("WINNERS_COUNT_LABEL", langToEnd), value: getTranslation("WINNERS_COUNT", langToEnd, { count: giveawayData.winnerCount.toString() }), inline: true });
    if (winners.length > 0) {
        originalEmbed.addFields({ name: getTranslation("WINNERS_ANNOUNCEMENT_LABEL", langToEnd), value: winners.map(id => `<@${id}>`).join(", "), inline: false });
    } else {
        originalEmbed.addFields({ name: getTranslation("WINNERS_ANNOUNCEMENT_LABEL", langToEnd), value: getTranslation("NO_VALID_ENTRANTS_FOR_WINNER_SELECTION", langToEnd), inline: false });
    }


    await giveawayMessage.edit({ embeds: [originalEmbed], components: [] }).catch(console.error);

    if (interactionOrMessage && !isAutoEnd) {
        const userWhoEnded = interactionOrMessage.user || interactionOrMessage.author;
        const successEmbed = new EmbedBuilder()
            .setColor(redThemeColor)
            .setTitle(getTranslation("SUCCESS_TITLE", langToEnd))
            .setDescription(getTranslation("GIVEAWAY_ENDED_MANUALLY_CONFIRM", langToEnd, { prize: `**${giveawayData.prize}**`, user: userWhoEnded.tag }))
            .setTimestamp();
        if (interactionOrMessage.reply) await interactionOrMessage.reply({ embeds: [successEmbed], ephemeral: true });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("gend")
        .setDescription("Manually ends a giveaway.")
        .addStringOption(option =>
            option.setName("message_id")
                .setDescription("The message ID of the giveaway to end")
                .setRequired(true)),
    name: "gend",
    aliases: ["giveawayend"],

    async execute(interaction, client, lang, getTranslation, giveawayPath, redThemeColor) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const permEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("PERM_ERROR_TITLE", lang))
                .setDescription(getTranslation("PERM_ERROR_GIVEAWAY_END", lang))
                .setTimestamp();
            return interaction.reply({ embeds: [permEmbed], ephemeral: true });
        }
        const messageId = interaction.options.getString("message_id");
        await endGiveawayLogic(client, messageId, interaction, getTranslation, giveawayPath, redThemeColor, false);
    },

    async executePrefix(message, args, client, lang, getTranslation, giveawayPath, redThemeColor) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const permEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("PERM_ERROR_TITLE", lang))
                .setDescription(getTranslation("PERM_ERROR_GIVEAWAY_END", lang))
                .setTimestamp();
            return message.reply({ embeds: [permEmbed] });
        }
        if (args.length < 1) {
            const usageEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("USAGE_ERROR_TITLE", lang))
                .setDescription(getTranslation("USAGE_ERROR_GEND", lang, { prefix: client.config.prefix }))
                .setTimestamp();
            return message.reply({ embeds: [usageEmbed] });
        }
        const messageId = args[0];
        await endGiveawayLogic(client, messageId, message, getTranslation, giveawayPath, redThemeColor, false);
    },
    endGiveawayLogic
};
