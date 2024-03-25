const { SlashCommandBuilder } = require('@discordjs/builders');
const { startBitcoinServer } = require('../../services/bitcoin');

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
        await interaction.reply(
            '# Comenzó el Halving Massacre!\n## Hagan sus apuestas! :money_with_wings: '
        );
    }
};
