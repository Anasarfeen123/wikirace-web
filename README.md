# WikiRace

A Flask-powered WikiRace game that runs locally and deploys cleanly on Vercel.

Players start on one Wikipedia article and race to a target article by clicking only in-article Wikipedia links. The app fetches live article content from the Wikipedia API, rewrites valid article links into game navigation links, tracks the route, and records time and click count.

## Features

- Random or custom start and target articles
- Live Wikipedia article rendering
- In-game link rewriting for valid main-namespace articles
- Click counter, timer, path history, give-up flow, and win modal
- Session-backed game recovery
- Vercel-ready Python serverless entrypoint

## Project Structure

```text
.
|-- api/index.py          # Flask app used by Vercel
|-- app.py                # Local launcher that imports api.index:app
|-- game_core.py          # Game state and timing logic
|-- wiki_api.py           # Wikipedia API client and HTML cleanup
|-- templates/            # Jinja pages
|-- static/               # CSS, JavaScript, logo
|-- requirements.txt      # Python dependencies
`-- vercel.json           # Routes all requests to the Flask app
```

## Local Development

Create a virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set a session secret and a Wikimedia contact identity:

```bash
export FLASK_SECRET_KEY="change-this-local-secret"
export WIKIRACE_CONTACT_EMAIL="you@example.com"
```

Run the app:

```bash
python app.py
```

Open `http://127.0.0.1:5000`.

## Vercel Deployment

This repo is ready for Vercel as a Python serverless project.

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. Import the project in Vercel.
3. Use these project settings:

| Setting | Value |
| --- | --- |
| Framework Preset | `Other` |
| Build Command | Leave empty |
| Output Directory | Leave empty |
| Install Command | `pip install -r requirements.txt` |

1. Add the environment variables below.
2. Deploy.

### Environment Variables

| Name | Required | Purpose |
| --- | --- | --- |
| `FLASK_SECRET_KEY` | Yes | Signs Flask session cookies. Use a long random value in production. |
| `WIKIRACE_CONTACT_EMAIL` | Recommended | Adds a contact email to the Wikimedia `User-Agent`. |
| `WIKIMEDIA_CONTACT_EMAIL` | Optional | Fallback contact email if `WIKIRACE_CONTACT_EMAIL` is not set. |
| `WIKIMEDIA_USER_AGENT` | Optional | Fully custom Wikimedia `User-Agent`. Overrides the generated one. |

Generate a strong secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Why `vercel.json` Exists

Vercel serves Python functions from the `api/` directory. The rewrite in `vercel.json` sends every incoming route to `api/index.py`, allowing Flask to handle routes like `/`, `/game`, `/new_game`, `/navigate/<article>`, and `/api/state`.

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index"
    }
  ]
}
```

## Runtime Notes

- Game state is stored in memory and mirrored into the user session.
- On serverless platforms, in-memory state can disappear between invocations. The session copy lets active games recover when possible.
- For persistent leaderboards or multi-device continuity, add a database or Redis store.
- Wikipedia requests require an identifiable `User-Agent`; configure one of the contact environment variables before production deployment.

## Useful Routes

| Route | Method | Description |
| --- | --- | --- |
| `/` | `GET` | Home screen and game setup |
| `/new_game` | `POST` | Starts a random or custom game |
| `/game` | `GET` | Current game screen |
| `/navigate/<article>` | `GET` | Moves to a linked article |
| `/give_up` | `POST` | Ends the current game |
| `/api/state` | `GET` | Returns current game state as JSON |
| `/api/random_pair` | `GET` | Returns a random start and target article |

## Dependencies

- Flask
- Requests
- Beautiful Soup
- lxml

Install them with:

```bash
pip install -r requirements.txt
```

## License

No license file is currently included. Add one before distributing or accepting external contributions.
>>>>>>> wikirace-web
