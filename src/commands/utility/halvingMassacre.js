const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('comenzar-halving-massacre')
        .setDescription('Comenzar el juego :boom:')
        .addNumberOption((option) =>
            option
                .setName('intervalo')
                .setDescription(
                    'Cada cuantos bloques se va a hacer la MASSACRE!'
                )
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName('bloque-inicial')
                .setDescription(
                    'Bloque en el cual se cierran las apuestas y comienza el juego!'
                )
                .setRequired(true)
        )
        .addUserOption((option) =>
            option
                .setName('zap-bot')
                .setDescription('Bot que se va a usar para zapear')
                .setRequired(true)
        )
        .addUserOption((option) =>
            option
                .setName('usuario-pozo')
                .setDescription('Usuario que va a recibir las apuestas')
                .setRequired(true)
        ),
    async execute(interaction) {
        const intervalo = interaction.options.getNumber('intervalo');
        const bloqueInicial = interaction.options.getNumber('bloque-inicial');

        const message = await interaction.reply({
            content:
                '# Nuevo Halving Massacre iniciado! <:guevitos:1217916631834169465>' +
                `\n- :checkered_flag: Bloque inicial: **${bloqueInicial}**` +
                `\n- :skull_crossbones: Se masacra cada: **${intervalo}** bloques` +
                '\n\nHagan sus apuestas! :money_with_wings: :point_down:',
            fetchReply: true
        });

        let thread;
        try {
            thread = await message.startThread({
                name: 'Halving Massacre ' + bloqueInicial,
                type: ChannelType.PublicThread
            });

            await thread.join();
        } catch (error) {
            console.error(error);
        }

        const client = interaction.client;

        client.on('messageCreate', async (message) => {
            if (message.channel.id !== thread.id) return;

            const zapBot = interaction.options.getUser('zap-bot');
            if (message.author.id !== zapBot.id) return;

            const usuarioPozo = interaction.options.getUser('usuario-pozo');
            const reciverId = message.content
                .match(/<@(\d+)>/g)[1]
                .slice(2, -1);
            if (usuarioPozo.id !== reciverId) return;

            const sender = message.mentions.users.first();
            const amount = message.content.match(/envió (\d+) satoshis/)[1];

            console.log(
                'Nueva apuesta recibida\n' +
                    `de: ${sender.displayName}\n` +
                    `por: ${amount} sats`
            );
        });
    }
};
