# Halving Massacre Bot

> First iteration

# Setup

1. Start up project
    ```sh
    nvm use
    ```
    ```sh
    pnpm install
    ```

2. Create and complete .env
    ```sh
    cp .env.example .env
    ```
    > NOTE: data to complete this is in step 3

3. Create and add bot to server
    - Go to [Discord Developers Dashboard](https://discord.com/developers) and create new app.
    - Invite yout bot to your server with that link, remplace DISCORD_APP_ID (Is the same of .env):

        ```text
        https://discord.com/oauth2/authorize?client_id=DISCORD_APP_ID&permissions=328565197888&scope=bot+applications.commands
        ```

3. Deploy commands
    ```sh
    node src/deployCommands.js
    ```
    > NOTE: if you edit or create new commands in `src/commands/utility` need excecute again this command before run bot.

4. Run bot
    ```sh
    pnpm dev
    ```

# To Do

- [x] Create thread for the game
- [x] Handle messages from LNBits-bot 
- [ ] Watch blockchain
- [ ] User database
- [ ] Implement [halving massacre algorithm](https://github.com/lacrypta/halving-massacre)