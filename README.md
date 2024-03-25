# Halving Massacre Bot

> First iteration

# Setup

1. Start up project
```bash
nvm use
```
```bash
pnpm install
```

2. Create and complete .env
```bash
cp .env.example .env
```

3. Create and add bot to server
- Go to [Discord Developers Dashboard](https://discord.com/developers) and create new app.
- Invite yout bot to your server with that link, remplace YOUR_CLIENT_ID:

    `https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=328565197888&scope=bot+applications.commands`

3. Deploy commands
```bash
node src/deployCommands.js
```

4. Run bot
```
pnpm dev
```

# To Do

- [ ] Create thread for the game
- [ ] User database
- [ ] Implement [halving massacre algorithm](https://github.com/lacrypta/halving-massacre)
- [ ] Watch blockchain