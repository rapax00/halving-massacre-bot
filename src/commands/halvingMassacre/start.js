/**
 * TODO:
 * - add closing bets when next massacre - 2 blocks remain and notify the players
 * - Fix int for float amount
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');
const { getLastBlockAndHash } = require('../../services/mempool.js');
const { halve } = require('./lottery.js');

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
            lastBlock = parseInt((await getLastBlockAndHash()).height);
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

        //-------------------------------------------------- Create thread --------------------------------------------------///
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

        //-------------------------------------------------- Listen for new bets --------------------------------------------------///
        // Listen for new messages in the thread
        const client = interaction.client;
        let players = {};

        // To use to look ranking
        function generatePlayersContent() {
            if (Object.keys(players).length === 0)
                return 'No hay apuestas todavía';

            let contenido = '**Apostantes y apuestas:**\n';
            for (const playerId in players) {
                const user = client.users.cache.get(playerId);
                contenido += `- ${user.toString()}: ${
                    players[playerId]
                } sats <:sats:1156332987080777788>\n`; // La Crypta: :sats:1156332987080777788, Testnet: :sats:1222003895434477639
            }
            return contenido;
        }

        let updateBiders = false;
        client.on('messageCreate', async (message) => {
            if (message.channel.id !== thread.id) return; // Ignore messages from other channels

            const zapBot = interaction.options.getUser('zap-bot');
            if (message.author.id !== zapBot.id) return; // Ignore messages than are not from the zap-bot

            const usuarioPozo = interaction.options.getUser('usuario-pozo');
            const match = message.content.match(/<@(\d+)>/g);
            const reciverId = match ? match[1].slice(2, -1) : null;
            if (usuarioPozo.id !== reciverId) return; // Ignore zaps to other users than the usuario-pozo

            const sender = message.mentions.users.first();
            const amount = parseInt(
                message.content.match(/envió (\d+) satoshis/)[1]
            );

            // Find the player in the players object
            if (
                !players.hasOwnProperty(sender.id) &&
                lastBlock < bloqueInicial
            ) {
                // If player not found and it's before the first massacre, add new player
                players[sender.id] = amount;

                // Send a message to the thread when a new bet is received
                thread.send({
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
            } else if (players.hasOwnProperty(sender.id)) {
                // If player found, update player's amount
                players[sender.id] += amount;

                // Send a message to the thread when a new bet is received
                thread.send({
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
                // If it's after the first massacre, don't accept new bets
                thread.send({
                    content:
                        `${sender.toString()} no se aceptan más apuestas :no_entry_sign:\n` +
                        `tus satoshis quedaron en el limbo :hole:\n`
                });
                console.log('Don´t accept more bets');
            }

            // Update and notify
            console.log('palyerss: ', players);
            updateBiders = true;
            updateMessage();
        });

        //-------------------------------------------------- Update the message --------------------------------------------------///
        // Update the message every 10 seconds and notify massacre
        async function updateMessage() {
            let oldLastBlock = lastBlock;
            lastBlock = parseInt((await getLastBlockAndHash()).height);

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
                const playerIds = Object.keys(players);

                if (playerIds.length === 0) {
                    await thread.send({
                        content:
                            'No hay apuestas, no se puede hacer la masacre :no_entry_sign:'
                    });
                    console.log('No havent bets, can´t make the massacre');
                    try {
                        clearInterval(updateMessageInterval);
                        await thread.setLocked(true);
                    } catch (error) {
                        console.error(error);
                    }
                    return;
                } else if (playerIds.length === 1) {
                    const user = client.users.cache.get(playerIds[0]);
                    await thread.send({
                        content:
                            `# :trophy: **${user.toString()}** es el ganador de la masacre :trophy:\n` +
                            `con **${
                                players[playerIds[0]]
                            } sats** <:sats:1156332987080777788>`
                    });
                    try {
                        clearInterval(updateMessageInterval);
                        // await thread.setLocked(true);
                    } catch (error) {
                        console.error(error);
                    }
                    return;
                }

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
                    content: `# :boom: :boom: ¡¡¡MASSACRE!!! :boom: :boom:\n||@everyone||`
                });

                // Make the massacre
                const blockHash = (await getLastBlockAndHash()).hash.toString();
                players = halve(blockHash, players);

                if (playerIds.length === 1) {
                    const user = client.users.cache.get(playerIds[0]);
                    await thread.send({
                        content:
                            `# :trophy: **${user.toString()}** es el ganador de la masacre :trophy:\n` +
                            `con **${
                                players[playerIds[0]]
                            } sats** <:sats:1156332987080777788>`
                    });
                    try {
                        clearInterval(updateMessageInterval);
                        // await thread.setLocked(true);
                    } catch (error) {
                        console.error(error);
                    }
                } else {
                    // Print players ranking
                    let contenido = '**Ranking de la masacre:**\n';
                    for (const playerId of playerIds) {
                        const user = client.users.cache.get(playerId);
                        contenido += `- ${user.toString()}: ${
                            players[playerId]
                        } sats <:sats:1156332987080777788>\n`;
                    }
                    await thread.send({
                        content: contenido
                    });
                }

                updateBiders = true;
                updateMessage();
            }
        }

        const updateMessageInterval = setInterval(updateMessage, 10000); // If not make new bets, update every 10 seconds
    }
};
