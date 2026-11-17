# Party server

Party mode (Raid and Duel) lets friends answer from their phones while one screen hosts the game.
The phones and the host talk through this small Cloudflare Worker. It keeps no game data: it only
passes messages along, one room per 4-letter code. An idle room costs nothing.

## Turn it on (once)

1. Open the Cloudflare dashboard and go to **Workers & Pages**.
2. Select **Create application**, then **GitHub**, and pick the `study-decks` repository.
3. Name the project `study-decks-party`.
4. Set the **Root directory** to `party`. Leave the build command empty and the deploy command as `npx wrangler deploy`.
5. Select **Save and Deploy**. When it finishes, copy the address it shows, which looks like
   `study-decks-party.<your-name>.workers.dev`.
6. In Study Decks, open Battle, choose **Party**, paste the address, and select **Connect**.

Optional: in the Worker's **Settings > Builds**, set the build watch path to `party/*` so adding decks
does not redeploy the Worker.

## Files

- `src/index.js` the relay (one Durable Object per room, hibernating WebSockets)
- `wrangler.jsonc` Worker settings
- Test locally with `npm install` then `npx wrangler dev`
