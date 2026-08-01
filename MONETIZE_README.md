Monetization resources added by the assistant

Files added:
- scripts/liquidsoap_ads.liq  - Liquidsoap template for ad insertion and remote enqueueing of ad files
- web/adsense_and_cmp.html   - Example HTML showing AdSense responsive unit + cookie consent
- sponsorship/Sponsor_Deck_Template.md - Sponsorship deck and rate-card template

What I did
- Added safe, well-documented templates you can adapt and upload to your server.
- Liquidsoap script includes an ad queue pattern (use Liquidsoap's telnet to enqueue ad files) and an example cron approach.
- AdSense snippet includes a CMP (cookie consent) integration; replace AdSense client/slot IDs and add your privacy page.
- Sponsorship deck is a Markdown template ready to be customized.

Next steps (recommended)
1) Replace placeholders with your real values (Icecast host, passwords, AdSense IDs, domain, contact).
2) If you want, I can:
   - Customize the Liquidsoap script to match your exact stream stack (Icecast vs SHOUTcast, ports, DJ input port).
   - Create a ready-to-publish index.html incorporating the ad snippet directly in your site layout.
   - Fill the sponsorship deck using your listener stats and produce a PDF slide deck.

If you'd like me to proceed with any of the above customizations, tell me:
- Is your streaming server Icecast or SHOUTcast?
- Do you use Liquidsoap already, and what are your current source mountpoints and admin/telnet ports?
- What's your site domain (so I can set correct AdSense/site verification steps and privacy URL)?
- Do you have listener stats (Icecast connect logs or Google Analytics) I can use to populate the sponsor deck?
