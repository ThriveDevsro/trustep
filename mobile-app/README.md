# TrustStep Mobile

Expo scaffold pre natívnu mobilnú vrstvu nad rovnakým TrustStep backendom.

## Čo je hotové

- registrácia a login proti `/api/auth/*`
- bearer token session pre natívneho klienta
- rovnaký incident dashboard ako na webe cez `/api/dev-requests`
- text analysis, URL analysis a screenshot analysis z galérie
- demo inbox creation + sync cez `/api/inboxes` a `/api/inboxes/sync`
- prepínateľná backend URL, aby sa appka vedela napojiť na laptop cez Wi‑Fi

## Spustenie

```bash
cd mobile-app
npm install
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.228:3000 npm run start
```

Potom otvor Expo Go na mobile a naskenuj QR kód.

Ak server na notebooku beží na inej LAN adrese, zmeň `EXPO_PUBLIC_API_BASE_URL` alebo ju uprav priamo v appke na obrazovke `Účet`.
