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

        try {
            const thread = await message.startThread({
                name: 'Halving Massacre ' + bloqueInicial,
                type: ChannelType.PublicThread
            });

            await thread.join();
        } catch (error) {
            console.error(error);
        }
    }
};
