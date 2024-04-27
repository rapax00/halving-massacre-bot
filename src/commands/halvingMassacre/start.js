/**
 * TODO:
 * - [x] Add closing bets when next massacre - 2 blocks remain and notify the players (Unncomment line 52)
 * - [x] Unncomment line 171
 * - [x] Fix int for float amount
 * - [x] Fix message reply
 * - [x] Pozo total
 * - [x] Instrucciones de uso a que bot mando
 * - [x] Avisar que no se puede apostar mas mensaje
 * - [x] bug: Personas eliminadas pueden seguir apostando
 * - [x] feature: numero de bloque en el que sucede la masacre
 * - [x] bug: despues de la masacre envia el mensaje de supervivientes e info
 * - [ ] feature: Marcador de mitad de tabla
 */

const { SlashCommandBuilder } = require('discord.js');
const { ChannelType } = require('discord.js');
const { getLastBlockAndHash } = require('../../services/mempool.js');
const { halve } = require('../../helpers/halvingMasscare/lottery.js');

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
        closedBets = false;
        const intervalo = interaction.options.getNumber('intervalo');
        const bloqueInicial = interaction.options.getNumber('bloque-inicial');
        let count = 0;

        // Check if the interval is greater than 2
        if (intervalo < 2) {
            await interaction.reply({
                content: `El intervalo debe ser mayor o igual a 2 bloques.`,
                ephemeral: true
            });
            return;
        }
        // Check if the initial block is greater than the current block + 2
        let lastBlock;
        try {
            lastBlock = parseInt((await getLastBlockAndHash()).height);
            if (bloqueInicial <= lastBlock + 2) {
                await interaction.reply({
                    content: `El bloque inicial debe ser mayor al bloque actual + 2 (Intentá con **${
                        lastBlock + 3
                    }**).\nBloque actual: ${lastBlock}`,
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
                `\n- :alarm_clock: Bloque actual: **${lastBlock}**` +
                `\n- :skull_crossbones: Se masacra cada: **${intervalo}** bloques` +
                `\n- :checkered_flag: Masacre inicial en bloque: **${bloqueInicial}**` +
                '\n\n**Hagan sus apuestas!** :money_with_wings: :point_down:' +
                `\n*Enviá satoshis a ${interaction.options
                    .getUser('usuario-pozo')
                    .toString()} *` +
                ` [.](https://image.nostr.build/cf14a2dd5ed7aab9b316d8e2a2eec7aee01175f904528b17e098801375cbba83.png)`,
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
            console.log('Error creating thread');
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

            let lastString =
                nextMassacre === bloqueInicial
                    ? `\n- :checkered_flag:  Massacre inicial en: **${
                          bloqueInicial - lastBlock
                      }** bloques (${bloqueInicial})` +
                      '\n\nHagan sus apuestas! :money_with_wings: :point_down:'
                    : `\n- :boom: Próxima massacre en: **${
                          nextMassacre - lastBlock
                      }** bloques (${nextMassacre})` +
                      '\n\nHagan sus re-apuestas! :money_with_wings: :point_down:';

            let contenido =
                `# Info\n` +
                `\n- :alarm_clock: Bloque actual: **${lastBlock}**` +
                `\n- :skull_crossbones: Se masacra cada: **${intervalo}** bloques` +
                lastString;

            contenido += '\n\n**Ranking:**\n';
            // Sort players by amount desc
            const playersArray = Object.entries(players);
            playersArray.sort((a, b) => b[1] - a[1]);
            for (const [playerId, amount] of playersArray) {
                const user = client.users.cache.get(playerId);
                contenido += `- ${user.toString()}: ${amount} sats <:sats:1222003895434477639>\n`; // La Crypta: :sats:1156332987080777788, Testnet: :sats:1222003895434477639
            }

            // total sats
            let totalSats = 0;
            for (const playerId in players) {
                totalSats += players[playerId];
            }
            contenido += `\n**## Total en el pozo:** ${totalSats} sats <:sats:1222003895434477639>`;

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
            const amount = parseFloat(
                message.content.match(/envió (\d+) satoshis/)[1]
            );

            console.log(
                'nextMassacre: ',
                nextMassacre,
                'lastBlock: ',
                lastBlock
            );

            // Find the player in the players object and add to the list if first massacre doesn't happen
            if (closedBets) {
                // If it's after the first massacre, don't accept new bets
                thread.send({
                    content:
                        `${sender.toString()} no se aceptan más apuestas :no_entry_sign:\n` +
                        `tus satoshis quedaron en el pozo :hole:\n`
                });
                console.log('Don´t accept more bets');
            } else if (
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
                        `por: **${amount} sats** <:sats:1222003895434477639>`
                });
                console.log(
                    'Nueva apuesta recibida\n' +
                        `de: ${sender.displayName}\n` +
                        `por: ${amount} sats`
                );
                updateBiders = true;
            } else if (players.hasOwnProperty(sender.id)) {
                // If player found, update player's amount
                players[sender.id] += amount;

                // Send a message to the thread when a new bet is received
                thread.send({
                    content:
                        `**Nueva apuesta recibida** :money_mouth:\n` +
                        `de: **${sender.toString()}**\n` +
                        `por: **${amount} sats** <:sats:1222003895434477639>`
                });
                console.log(
                    'Nueva apuesta recibida\n' +
                        `de: ${sender.displayName}\n` +
                        `por: ${amount} sats`
                );
                updateBiders = true;
            } else if (
                !players.hasOwnProperty(sender.id) &&
                lastBlock > bloqueInicial
            ) {
                thread.send({
                    content:
                        `${sender.toString()} no ingresaste en la primera ronda del juego\n` +
                        `tus satoshis quedaron en el pozo :hole:\n`
                });
            }

            // Update and notify
            console.log('palyerss: ', players);
            updateMessage();
        });

        //-------------------------------------------------- Send new the message --------------------------------------------------///
        // Update the message every 10 seconds and notify massacre
        async function updateMessage() {
            let oldLastBlock = lastBlock;
            lastBlock = parseInt((await getLastBlockAndHash()).height);

            // Close bets when next massacre - 2 blocks remain
            console.log(`${count} closedBets: `, closedBets);
            if (!closedBets && lastBlock >= nextMassacre - 2) {
                closedBets = true;
                await thread.send({
                    content: '# APUESTAS CERRADAS :no_entry_sign:\n'
                });
                return;
            } else if (
                count >= 12 &&
                closedBets &&
                lastBlock >= nextMassacre - 2
            ) {
                count = 0;
                await thread.send({
                    content:
                        '# FREEZADO :snowflake:\nEl bloque actual es: **' +
                        lastBlock +
                        '**\n'
                });
            }
            // Check if the last block has changed and if the next massacre has not been reached
            if (
                count >= 12 ||
                (oldLastBlock !== lastBlock && lastBlock !== nextMassacre) ||
                updateBiders
            ) {
                count = 0;
                updateBiders = false;

                await thread.send({
                    content: generatePlayersContent()
                });
            }
            // Check if the next massacre has been reached
            else if (lastBlock === nextMassacre) {
                async function playerWin() {
                    const user = client.users.cache.get(playerIds[0]);
                    await thread.send({
                        content:
                            `# :trophy: **${user.toString()}** es el ganador de la massacre :trophy:\n` +
                            `## con **${
                                players[playerIds[0]]
                            } sats** <:sats:1222003895434477639>` +
                            ` [.](https://giphy.com/gifs/win-argument-3rUbeDiLFMtAOIBErf)`
                    });
                    try {
                        clearInterval(updateMessageInterval);
                        // await thread.setLocked(true);
                    } catch (error) {
                        console.error(error);
                    }
                }

                // Test if are 1 or 0 players
                let playerIds = Object.keys(players);
                if (playerIds.length === 0) {
                    await thread.send({
                        content:
                            'No hay apuestas, no se puede hacer la massacre :no_entry_sign:' +
                            '[.](https://tenor.com/view/pigeon-sad-paloma-triste-gif-20654343)'
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
                    await playerWin();
                    return;
                }

                nextMassacre += intervalo;

                // Make the massacre
                const blockHash = (await getLastBlockAndHash()).hash.toString();
                players = halve(blockHash, players);
                playerIds = Object.keys(players);

                await thread.send({
                    // message wiht @everyone to notify the massacre
                    content:
                        `# :boom: :boom: ¡¡¡MASSACRE!!! :boom: :boom:\n` +
                        `|| @everyone ||` +
                        ` [.](https://giphy.com/gifs/SignatureEntertainmentUK-war-movie-wolves-of-wolvesofwar-Uxv3xZTNmwKQkWTpUd)`
                });

                if (playerIds.length === 1) {
                    await playerWin();
                    return;
                } else {
                    // Print players ranking
                    await thread.send({
                        content: '# Supervivientes\n' + generatePlayersContent()
                    });
                }

                closedBets = false;
                updateBiders = true;
            }
            count++;
        }

        const updateMessageInterval = setInterval(updateMessage, 10000); // If not make new bets, update every 10 seconds
    }
};
