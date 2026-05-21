"""Local Flask launcher.

The canonical app lives in api/index.py so the same object can be used by
Vercel and local development.
"""

from api.index import app


if __name__ == "__main__":
    app.run(debug=True)
