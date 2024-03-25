const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        try {
            // if (message.author.bot) return;

            console.log(message);
        } catch (error) {
            console.error(error);
        }
    }
};
