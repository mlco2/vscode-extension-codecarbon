# Contributing

Thanks for contributing! To keep the project healthy and maintainable, please follow these guidelines:

1. Fork the repo and create a branch from `main`.
2. Keep changes focused and small.

# Table of Contents
- [Coding](#coding)
  - [The UI: Typescript code (`src/`)](#the-ui-typescript-code-src)
  - [Python scripts (`src/scripts`)](#python-scripts-srcscripts)
- [Manual testing in VS Code (debug)](#manual-testing-in-vs-code-debug)
- [Testing](#testing)
- [Note on Codecarbon](#note-on-codecarbon)

## Coding

- **Initial word**: The extension is built with TypeScript (`src/`), and helper scripts are in Python (`src/scripts/`). They run the `codecarbon` library to track emissions.
As you will see, part of the complexity of this setup comes from coordinating between the TypeScript extension and the Python scripts.

### The UI: Typescript code (`src/`)

- Follow existing style and keep functions/modules simple.
- Install Node and npm, then build the extension:

```bash
npm install
npm run build
```
- Run lint before opening a PR:

```bash
npm run lint
```

### Python scripts (`src/scripts`)

- Keep script output stable: `tracker.py` emits `METRICS:<json>` lines consumed by the extension.
- Validate Python changes with:

```bash
npm run test:python
```
- The extension needs to handle if the user has Python installed and if `codecarbon` is available. If it does not, please open an issue to track this improvement.
- Quick manual check (optional):
```bash
your_python_interpreter src/scripts/tracker.py start
```
- For example, me I use [uv](https://docs.astral.sh/uv/getting-started/installation/):

```bash
uv run src/scripts/tracker.py start
```

## Manual testing in VS Code (debug)

1. In VS Code, open this repo.
2. Start the `Run Extension` launch configuration. For that go to `Run` > `Start Debugging` or run `F5`. This will open a new version of VS Code with the Codecarbon extension loaded.
3. See if your changes work as expected in the new VS Code window. Check the extension's output and behavior.

## Testing

Run the tests with:

```bash
npm test
```

You can also run tests by layer:

```bash
npm run test:smoke
npm run test:python
npm run test:ts
```

# Note on Codecarbon
This VSCode extension relies on `codecarbon` to track emissions. Check the [codecarbon repo](https://github.com/mlco2/codecarbon) for more details on how it works and how to contribute to it as well.