# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

YelpCamp: a server-rendered Express 5 + MongoDB (Mongoose) campground review app using EJS views (via `ejs-mate` layouts), Passport local auth, Cloudinary image uploads, and Mapbox geocoding/maps. Plain CommonJS JavaScript with no build step, no test suite and no linter configured.

## Commands

- `npm run dev` — start the server (`node app.js`), default port 3002 (`PORT` overrides).
- `node seeds/index.js` — **wipes** the `campgrounds` collection and inserts 200 random campgrounds. It always connects to `mongodb://localhost:27017/yelp-camp` (ignores `MONGODB_URL`) and hardcodes an `author` ObjectId that must exist as a user in your local DB.
- `npm run build` — just `npm install`; there is nothing to compile.

## Environment

Outside `NODE_ENV=production`, `app.js` loads `.env` via dotenv and forces DNS servers to 8.8.8.8/1.1.1.1 (workaround for Node c-ares on Windows — needed to resolve Atlas/Mapbox hosts). Variables used:

- `MONGODB_URL` (falls back to local `yelp-camp`), `SECRET` (session secret)
- `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET`
- `MAPBOX_TOKEN` — read server-side for geocoding and also injected into views via `process.env.MAPBOX_TOKEN`

## Architecture

Request flow: `app.js` → router (`routes/`) → middleware chain (`middleware.js`) → controller (`controllers/`) → model (`models/`) → EJS view (`views/`, wrapped by `views/layouts/boilerplate.ejs`).

- **Route composition**: `routes/reviews.js` is mounted at `/campgrounds/:id/reviews` and uses `Router({ mergeParams: true })` to read `:id`. Users routes are mounted at `/`.
- **Middleware order on mutating routes** matters: `isLoggedIn` → `isAuthor`/`isReviewAuthor` → `upload.array('image')` (multer must run before validation so `req.body` is populated for multipart forms) → `validateCampground`/`validateReview` → `catchAsync(controller)`.
- **Validation**: Joi schemas in `schemas.js`, extended with a custom `escapeHTML()` string rule that rejects any input containing HTML-special characters. Request bodies are namespaced (`campground[title]`, `review[body]`), so schemas validate `req.body.campground` / `req.body.review`.
- **Errors**: async handlers are wrapped in `utils/catchAsync`; throw `ExpressError(message, status)` for expected failures. A catch-all `app.use` produces 404s and the final error handler renders `views/error.ejs`.
- **Security middleware in `app.js`**: a hand-rolled mongo-sanitize (strips `$`/`.` keys from `req.body`/`req.params`, since `express-mongo-sanitize` isn't Express 5 compatible) and a Helmet CSP with explicit allowlists. **Any new external script/style/image/font host must be added to the CSP arrays in `app.js`**, or it will be blocked in the browser. Image/media sources are pinned to the `onestep-webdev` Cloudinary account.
- **Sessions/auth**: `express-session` stored in Mongo via `connect-mongo` (`app_sessions` collection); Passport local strategy through `passport-local-mongoose` on `models/user.js`. `res.locals.currentUser`, `success`, `error` (flash) are available in every view.
- **Image uploads**: `cloudinary/index.js` defines a custom multer storage engine (`CloudinaryStorage`) that streams to Cloudinary and exposes `path` (secure URL) and `filename` (public_id) on `req.files`. Deleting images on edit uses the `deleteImages[]` form field (restricted to that campground's own images). Requests rejected after multer has run must call `deleteUploads(req.files)` so uploads aren't orphaned on Cloudinary.
- **Maps**: campgrounds store GeoJSON `geometry` (Point) from Mapbox forward geocoding at create/update time. The model sets `toJSON: { virtuals: true }` and defines `properties.popUpMarkup`, so `JSON.stringify(campground)` in views yields GeoJSON-feature-shaped objects consumed by `public/javascripts/clusterMap.js` (index) and `showPageMap.js` (show).
- **Cascade delete**: a `findOneAndDelete` post-hook on `Campground` deletes its reviews — so deletes must go through `findByIdAndDelete`/`findOneAndDelete` to trigger it.

## Deployment / maintenance

- Hosted on Render. The Node version (25.x) is set in Render's environment, not in the repo — don't add `.nvmrc`/`engines` pins.
- Dependabot (`.github/dependabot.yml`) opens one weekly grouped PR for minor/patch bumps; major bumps arrive as individual PRs.
