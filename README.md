# AI Calculator

A mobile-first calculator app with a local math engine and an optional AI endpoint for open-ended reasoning.

## Run locally

Open `index.html` in a browser, or serve this folder over HTTP:

```sh
python3 -m http.server 8000
```

The local engine handles arithmetic expressions, percentages, linear and quadratic equations, common statistics, compound interest, a common elevation-angle problem, binomial probabilities, and conversions of length, mass, time, volume, and temperature without a network connection. Its expression parser also supports powers, square roots, and basic trigonometric and logarithmic functions.

## Enable AI answers

The `/api/solve` serverless function is intended for Vercel. Deploy this folder, then set `OPENAI_API_KEY` in the Vercel project's environment variables. `OPENAI_MODEL` is optional and defaults to `gpt-4o-mini`. The browser calls the serverless function only when a question is outside the local engine. The AI fallback can help with broader topics such as calculus, geometry, and linear algebra, but generated answers are not a computer algebra system and should be checked for high-stakes use. Arbitrary code execution is not provided. The API key remains on the server.

When served as a Vercel deployment over HTTPS, the app can be installed from the browser's install menu. The static local server provides the app shell and offline math, but not the serverless AI endpoint.

## Run local tests

```sh
node --test solver.test.js
```