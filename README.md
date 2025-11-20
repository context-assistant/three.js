# three.js - Enhanced with Local AI Assistant

[![CI](https://github.com/context-assistant/three.js/actions/workflows/ci.yml/badge.svg)](https://github.com/context-assistant/three.js/actions/workflows/ci.yml)

#### JavaScript 3D library with AI-powered learning assistance

This is a fork of the original [three.js](https://github.com/mrdoob/three.js) project, enhanced with **local AI support** that enables an intelligent learning assistant. The assistant helps you learn three.js with full context of the entire three.js documentation, manuals, and your scene.

## 🌟 Key Features

- **Local AI Assistant**: Powered by Ollama, keeping your code and conversations private
- **Full Context Awareness**: The assistant has access to the complete three.js documentation, API reference, and manuals
- **Scene Understanding**: Works directly with your three.js scenes in the Editor and Playground
- **Customizable AI Agents**: Create personalized AI assistants with different personalities and configurations
- **No Backend Required**: Everything runs locally on your machine
- **Original three.js Features**: All standard three.js functionality remains intact

## 🚀 Quickstart

You can use this enhanced three.js directly from the deployed GitHub page without running the project locally. However, you will need to install Ollama and download a model to use the AI assistant features.

### Step 1: Install Ollama

Visit [https://ollama.ai](https://ollama.ai) and install Ollama for your operating system.

### Step 2: Download a Model

Once Ollama is installed, download a compatible model. Recommended models for code assistance:

```bash
ollama pull llama3.2:3b        # Lightweight option (fast, good for simple tasks)
ollama pull llama3.2:7b        # Balanced option (recommended)
ollama pull deepseek-coder:6.7b # Code-specialized model
ollama pull qwen2.5-coder:7b   # Another excellent coding model
```

### Step 3: Access the Enhanced three.js

Simply navigate to the deployed GitHub page and you're ready to use the AI assistant!

### Step 4: Configure the AI Assistant

1. Click the chat button in the top-right corner
2. Navigate to Settings (gear icon or via the Settings menu item)
3. Configure your Ollama endpoint (default: `http://localhost:11434`)
4. Select or create an AI agent with your preferred model
5. Customize the assistant's personality if desired

## 💬 Using the AI Assistant

The AI assistant can help you with:

- **Learning three.js concepts**: Ask questions about how three.js works
- **Debugging**: Share your code and get help identifying issues
- **Scene analysis**: The assistant understands objects in your three.js Editor and Playground scenes
- **Code examples**: Request specific code snippets or examples
- **API reference**: Get information about three.js classes, methods, and properties

### Scene Context

When working in the Editor or Playground, the assistant has full context of your scene:
- Mention objects by name using `@ObjectName` to get specific help
- The assistant knows about your scene structure, camera position, and materials
- Context is automatically provided from the documentation pages when viewing the Manual or API docs

## 📁 Project Structure

The enhanced three.js fork includes:

```
context-assistant/     # AI assistant interface (see context-assistant/README.md for details)
  ├── src/            # Assistant UI components and services
  ├── public/         # Static assets
  └── tests/          # Test suite

docs/                 # Three.js API documentation
manual/               # Three.js learning manual
examples/             # Three.js examples
editor/               # Three.js scene editor
playground/           # Node-based shader editor
src/                  # Core three.js library source code
```

## 🔧 Local Development

If you want to run this project locally for development:

```bash
# Install dependencies
npm install

# Build three.js
npm run build

# Run the context assistant (from context-assistant directory)
cd context-assistant
npm install
npm run dev
```

## 📚 Original three.js Resources

- [Examples](https://threejs.org/examples/)
- [Documentation](https://threejs.org/docs/)
- [Manual](https://threejs.org/manual/)
- [Wiki](https://github.com/mrdoob/three.js/wiki)
- [Discord](https://discord.gg/56GBJwAnUS)
- [Forum](https://discourse.threejs.org/)

## 🤝 Contributing

This project is a fork of [three.js](https://github.com/mrdoob/three.js) by [mrdoob](https://github.com/mrdoob) and contributors. The AI assistant enhancement is built on top of the original three.js library.

## 📝 License

[MIT License](LICENSE) - Same as the original three.js project.

## 🙏 Acknowledgments

- Original three.js by [mrdoob](https://github.com/mrdoob) and the three.js community
- Ollama for providing local LLM capabilities
- All three.js contributors

---

**Note**: The AI assistant requires Ollama to be running locally. All processing happens on your machine - no data is sent to external servers.

[npm]: https://img.shields.io/npm/v/three
[npm-url]: https://www.npmjs.com/package/three
[build-size]: https://badgen.net/bundlephobia/minzip/three
[build-size-url]: https://bundlephobia.com/result?p=three
[npm-downloads]: https://img.shields.io/npm/dw/three
[npmtrends-url]: https://www.npmtrends.com/three
[discord]: https://img.shields.io/discord/685241246557667386
[discord-url]: https://discord.gg/56GBJwAnUS
