const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');
const { getLastBlock } = require('../../services/mempool.js');

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

        // Check if the initial block is greater than the current block + 2
        let lastBlock;
        try {
            lastBlock = await getLastBlock();
            if (bloqueInicial < lastBlock + 2) {
                await interaction.reply({
                    content: `El bloque inicial debe ser mayor al bloque actual + 2.\nBloque actual: ${lastBlock}`,
                    ephemeral: true
                });
                return;
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'Error al obtener el último bloque',
                ephemeral: true
            });
            return;
        }

        // Send the initial message
        let nextMassacre = bloqueInicial;
        const initialMessage = await interaction.reply({
            content:
                '# Nuevo Halving Massacre iniciado! <:guevitos:1217916631834169465>' +
                `\n- :checkered_flag: Bloque inicial: **${bloqueInicial}**` +
                `\n- :skull_crossbones: Se masacra cada: **${intervalo}** bloques` +
                `\n- :alarm_clock: Bloque actual: **${lastBlock}**` +
                `\n- :boom: Masacre inicial en: **${
                    nextMassacre - lastBlock
                }** bloques` +
                '\n\nHagan sus apuestas! :money_with_wings: :point_down:',
            fetchReply: true
        });

        // Create a thread for the game
        let thread;
        try {
            thread = await initialMessage.startThread({
                name: 'Halving Massacre ' + bloqueInicial,
                type: ChannelType.PublicThread
            });

            await thread.join();
        } catch (error) {
            console.error(error);
        }

        // Listen for new messages in the thread
        const client = interaction.client;
        const players = {};

        // To use to look ranking
        function generatePlayersContent() {
            if (Object.keys(players).length === 0)
                return 'No hay apuestas todavía';

            let contenido = '**Apostantes y apuestas:**\n';
            for (const userId in players) {
                const user = client.users.cache.get(userId);
                contenido += `- ${user.toString()}: ${
                    players[userId]
                } sats <:sats:1156332987080777788>\n`;
            }
            return contenido;
        }

        let updateBiders = false;
        client.on('messageCreate', async (message) => {
            if (message.channel.id !== thread.id) return; // Ignore messages from other channels

            const zapBot = interaction.options.getUser('zap-bot');
            if (message.author.id !== zapBot.id) return; // Ignore messages than are not from the zap-bot

            const usuarioPozo = interaction.options.getUser('usuario-pozo');
            const reciverId = message.content
                .match(/<@(\d+)>/g)[1]
                .slice(2, -1);
            if (usuarioPozo.id !== reciverId) return; // Ignore zaps to other users than the usuario-pozo

            const sender = message.mentions.users.first();
            const amount = parseInt(
                message.content.match(/envió (\d+) satoshis/)[1]
            );

            // Check if player already exists and if first massacre happends
            if (!players[sender.id] && lastBlock < bloqueInicial) {
                players[sender.id] = amount;

                updateMessage();
                updateBiders = true;

                thread.send({
                    // Send a message to the thread when a new bet is received
                    content:
                        `**Nueva apuesta recibida** :money_mouth:\n` +
                        `de: **${sender.toString()}**\n` +
                        `por: **${amount} sats** <:sats:1156332987080777788>`
                });
                console.log(
                    'Nueva apuesta recibida\n' +
                        `de: ${sender.displayName}\n` +
                        `por: ${amount} sats`
                );
            } else if (players[sender.id]) {
                players[sender.id] += amount;

                updateMessage();
                updateBiders = true;

                thread.send({
                    // Send a message to the thread when a new bet is received
                    content:
                        `**Nueva apuesta recibida** :money_mouth:\n` +
                        `de: **${sender.toString()}**\n` +
                        `por: **${amount} sats** <:sats:1156332987080777788>`
                });
                console.log(
                    'Nueva apuesta recibida\n' +
                        `de: ${sender.displayName}\n` +
                        `por: ${amount} sats`
                );
            } else {
                // Send a message to the thread when a new bet is received after the first massacre
                thread.send({
                    content:
                        `${sender.toString()} no se aceptan más apuestas :no_entry_sign:\n` +
                        `tus satoshis quedaron en el limbo :hole:\n`
                });
                console.log('Don´t accept more bets');
            }
        });

        // Update the message every 10 seconds and notify massacre
        async function updateMessage() {
            let oldLastBlock = lastBlock;
            lastBlock = await getLastBlock();

            // Check if the last block has changed and if the next massacre has not been reached
            if (
                (oldLastBlock !== lastBlock && lastBlock !== nextMassacre) ||
                updateBiders
            ) {
                updateBiders = false;

                let lastString =
                    nextMassacre === bloqueInicial
                        ? `\n- :boom: Masacre inicial en: **${
                              nextMassacre - lastBlock
                          }** bloques` +
                          '\n\nHagan sus apuestas! :money_with_wings: :point_down:'
                        : `\n- :boom: Próxima masacre en: **${
                              nextMassacre - lastBlock
                          }** bloques` +
                          '\n\nHagan sus re-apuestas! :money_with_wings: :point_down:';
                await interaction.editReply({
                    content:
                        '# Nuevo Halving Massacre iniciado! <:guevitos:1217916631834169465>' +
                        `\n- :checkered_flag: Bloque inicial: **${bloqueInicial}**` +
                        `\n- :skull_crossbones: Se masacra cada: **${intervalo}** bloques` +
                        `\n- :alarm_clock: Bloque actual: **${lastBlock}**` +
                        lastString +
                        '\n\n' +
                        generatePlayersContent()
                });
            }
            // Check if the next massacre has been reached
            else if (lastBlock === nextMassacre) {
                nextMassacre += intervalo;

                await interaction.editReply({
                    content:
                        '# Nuevo Halving Massacre iniciado! <:guevitos:1217916631834169465>' +
                        `\n- :checkered_flag: Bloque inicial: **${bloqueInicial}**` +
                        `\n- :skull_crossbones: Se masacra cada: **${intervalo}** bloques` +
                        `\n- :alarm_clock: Bloque actual: **${lastBlock}**` +
                        `\n- :boom: Próxima masacre: **${
                            nextMassacre - lastBlock
                        }** bloques` +
                        '\n\nHagan sus re-apuestas! :money_with_wings: :point_down:' +
                        '\n\n' +
                        generatePlayersContent()
                });

                await thread.send({
                    // message wiht @everyone to notify the massacre
                    content: `¡¡¡MASSACRE!!! :boom: :boom: :boom:\n||@everyone||`
                });
            }
        }

        setInterval(updateMessage, 10000);
    }
};
