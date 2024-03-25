const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channels')
        .setDescription('Replies with all channels in the guild.'),
    async execute(interaction) {
        const guild = interaction.guild;
        const channelsArray = [];

        guild.channels.cache.forEach((channel) => {
            channelsArray.push(channel);
        });

        console.log('Channels:');
        channelsArray.forEach((channel) => {
            console.log(
                `Channel: ${channel.id} | Name: ${channel.name} | Type: ${channel.type}`
            );
            if (channel.type === 0) {
                channel.send('Hi :wave: , this is a text channel!');
            }
        });

        intereaction.reply('Check the console for the channels list!');
    }
};
