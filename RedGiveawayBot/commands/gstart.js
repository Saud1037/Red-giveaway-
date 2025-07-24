// /home/ubuntu/commands/gstart.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const ms = require("ms");

async function startGiveaway(context, client, lang, getTranslation, giveawayPath, redThemeColor, durationStr, winnerCount, prize, hostUser, channel) {
    const durationMs = ms(durationStr);
    if (!durationMs || durationMs <= 0) {
        const errorEmbed = new EmbedBuilder()
            .setColor(redThemeColor)
            .setTitle(getTranslation("ERROR_TITLE", lang))
            .setDescription(getTranslation("INVALID_DURATION_FORMAT", lang))
            .setTimestamp();
        if (context.reply) await context.reply({ embeds: [errorEmbed], ephemeral: true });
        else await context.channel.send({ embeds: [errorEmbed] });
        return;
    }

    const endTime = Date.now() + durationMs;

    const giveawayEmbed = new EmbedBuilder()
        .setColor(redThemeColor)
        .setTitle(getTranslation("GIVEAWAY_STARTED_TITLE", lang))
        .setDescription(
            `${getTranslation("PRIZE_LABEL", lang, { prize: `**${prize}**` })}\n` +
            `${getTranslation("REACT_TO_ENTER", lang)}\n` +
            `${getTranslation("ENDING_IN", lang, { time: `<t:${Math.floor(endTime / 1000)}:R>` })}\n` +
            `${getTranslation("HOSTED_BY", lang, { user: hostUser.toString() })}`
        )
        .addFields({ name: getTranslation("WINNERS_COUNT_LABEL", lang), value: getTranslation("WINNERS_COUNT", lang, { count: winnerCount.toString() }) , inline: true })
        .setFooter({ text: getTranslation("FOOTER_TEXT", lang), iconURL: client.user.displayAvatarURL() })
        .setTimestamp(endTime);

    const giveawayMessage = await channel.send({ embeds: [giveawayEmbed] });
    await giveawayMessage.react("🎉");

    let giveaways = {};
    if (fs.existsSync(giveawayPath)) {
        try {
            giveaways = JSON.parse(fs.readFileSync(giveawayPath));
        } catch (err) {
            console.error("Error reading giveaways.json:", err);
            const readErrorEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("ERROR_TITLE", lang))
                .setDescription(getTranslation("COMMAND_ERROR_GENERIC", lang)) // Or a more specific error
                .setTimestamp();
            // Notify user if this is a critical failure path for them
            if (context.reply) await context.reply({ embeds: [readErrorEmbed], ephemeral: true }); 
            else await context.channel.send({ embeds: [readErrorEmbed] });
            return; // Stop if we can't read the giveaways file
        }
    }

    giveaways[giveawayMessage.id] = {
        messageId: giveawayMessage.id,
        channelId: channel.id,
        guildId: channel.guild.id,
        prize: prize,
        endTime: endTime,
        winnerCount: winnerCount,
        hostId: hostUser.id,
        entrants: [],
        ended: false,
        lang: lang
    };

    fs.writeFileSync(giveawayPath, JSON.stringify(giveaways, null, 4));

    const successEmbed = new EmbedBuilder()
        .setColor(redThemeColor)
        .setTitle(getTranslation("SUCCESS_TITLE", lang))
        .setDescription(getTranslation("GIVEAWAY_START_SUCCESS", lang, { prize: `**${prize}**` }))
        .setTimestamp();

    if (context.reply) await context.reply({ embeds: [successEmbed], ephemeral: true });

    setTimeout(async () => {
        try {
            const currentGiveaways = JSON.parse(fs.readFileSync(giveawayPath));
            const gwData = currentGiveaways[giveawayMessage.id];
            if (gwData && !gwData.ended) {
                const endGiveawayFn = require("./gend.js").endGiveawayLogic;
                if (endGiveawayFn) {
                    await endGiveawayFn(client, giveawayMessage.id, null, getTranslation, giveawayPath, redThemeColor, true);
                } else {
                    console.error("gend.js or endGiveawayLogic not found for automatic ending.");
                }
            }
        } catch (err) {
            console.error(`Error automatically ending giveaway ${giveawayMessage.id}:`, err);
        }
    }, durationMs);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("gstart")
        .setDescription("Starts a new giveaway.")
        .addStringOption(option =>
            option.setName("duration")
                .setDescription("Duration of the giveaway (e.g., 1d, 12h, 30m)")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName("winners")
                .setDescription("Number of winners")
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName("prize")
                .setDescription("The prize for the giveaway")
                .setRequired(true)),
    name: "gstart",
    aliases: ["giveawaystart"],

    async execute(interaction, client, lang, getTranslation, giveawayPath, redThemeColor) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const permEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("PERM_ERROR_TITLE", lang))
                .setDescription(getTranslation("PERM_ERROR_GIVEAWAY_START", lang))
                .setTimestamp();
            return interaction.reply({ embeds: [permEmbed], ephemeral: true });
        }

        const durationStr = interaction.options.getString("duration");
        const winnerCount = interaction.options.getInteger("winners");
        const prize = interaction.options.getString("prize");

        await startGiveaway(interaction, client, lang, getTranslation, giveawayPath, redThemeColor, durationStr, winnerCount, prize, interaction.user, interaction.channel);
    },

    async executePrefix(message, args, client, lang, getTranslation, giveawayPath, redThemeColor) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const permEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("PERM_ERROR_TITLE", lang))
                .setDescription(getTranslation("PERM_ERROR_GIVEAWAY_START", lang))
                .setTimestamp();
            return message.reply({ embeds: [permEmbed] });
        }

        if (args.length < 3) {
            const usageEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("USAGE_ERROR_TITLE", lang))
                .setDescription(getTranslation("USAGE_ERROR_GSTART", lang, { prefix: client.config.prefix }))
                .setTimestamp();
            return message.reply({ embeds: [usageEmbed] });
        }

        const durationStr = args[0];
        const winnerCount = parseInt(args[1]);
        const prize = args.slice(2).join(" ");

        if (isNaN(winnerCount) || winnerCount < 1) {
            const errorEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("ERROR_TITLE", lang))
                .setDescription(getTranslation("INVALID_WINNERS_FORMAT", lang))
                .setTimestamp();
            return message.reply({ embeds: [errorEmbed] });
        }
        if (!prize) {
            const errorEmbed = new EmbedBuilder()
                .setColor(redThemeColor)
                .setTitle(getTranslation("ERROR_TITLE", lang))
                .setDescription(getTranslation("MISSING_PRIZE", lang))
                .setTimestamp();
            return message.reply({ embeds: [errorEmbed] });
        }

        await startGiveaway(message, client, lang, getTranslation, giveawayPath, redThemeColor, durationStr, winnerCount, prize, message.author, message.channel);
    }
};
