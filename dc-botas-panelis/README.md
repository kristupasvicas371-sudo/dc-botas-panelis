# Discord botas (be konsoles naudojimo)

Sis botas leidzia valdyti pagrindinius veiksmus per Discord.

## Funkcijos
- `/panel` - mygtuku panele.
- `/status` - tikrina ar Minecraft serveris online.
- `/ip` - parodo prisijungimo adresa.
- `/mc <command>` - paleidzia RCON komanda (tik admin).

## 1) Reikalavimai
- Node.js 18+
- Discord botas per Developer Portal
- Ijungtas RCON tavo Minecraft serveryje (jei nori `/mc`)

## 2) .env failas
```powershell
Copy-Item .env.example .env
```

Uzpildyk:
- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`
- `MC_HOST` (`MCDD.LT`)
- `MC_PORT` (`25565`)
- `RULES_CHANNEL_ID` (pasirinktinai)
- `ADMIN_ROLE_ID` (pasirinktinai, jei nori leisti ir ne-admin rolei)
- `MC_RCON_HOST`, `MC_RCON_PORT`, `MC_RCON_PASSWORD`

## 3) Paleidimas
```powershell
npm install
npm run start
```

## 4) Bot invite
Naudok nuoroda (pakeisk `CLIENT_ID`):

`https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=2147483648`

## 5) Saugumas
- `/mc` komanda veikia tik adminams arba rolei is `ADMIN_ROLE_ID`.
- Rekomenduojama naudoti stipru `RCON` slaptazodi.
- Nelaikyk `.env` viesoje repozitorijoje.
