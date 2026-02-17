# CHEMIC-AI Deployment Guide
*Research Environment v4.2.1*

This guide explains how to install, run, and modify the Chemic-AI simulation.

## 1. Prerequisites
You need **Node.js** installed on your computer.
- Download it from: [https://nodejs.org/](https://nodejs.org/) (LTS version recommended).

## 2. Installation
Open your terminal (Command Prompt or Terminal) in the project folder and run:

```bash
npm install
```

This will download all necessary dependencies (React, Three.js, Vite, etc.) into a `node_modules` folder.

## 3. Configuration (API Key)
To enable "Professor Gemini" (the AI voice), you need a Google Gemini API Key.

1.  Get a key from [Google AI Studio](https://aistudio.google.com/).
2.  Create a file named `.env` in the root folder.
3.  Add this line to the file:
    ```
    VITE_GEMINI_API_KEY=your_api_key_here
    ```
    *(Replace `your_api_key_here` with your actual key)*.

> **Note:** If you skip this, the Professor will still work using a limited local backup database!

## 4. Running the Simulation
To start the application in development mode:

```bash
npm run dev
```

- Look for the URL in the terminal (usually `http://localhost:5173` or `3000`).
- Ctrl+Click the link to open it in your browser.

## 5. Building for Production (Making a Game)
If you want to turn this into a standalone website ("Game"):

1.  Run the build command:
    ```bash
    npm run build
    ```
2.  This creates a `dist/` folder.
3.  You can upload the contents of `dist/` to any web host (GitHub Pages, Vercel, Netlify, Itch.io) to play it online.

## 6. Project Structure (Where to put code?)
If you want to modify the game, here is where the logic lives:

*   **`src/constants.ts`**: The "Database". Go here to add **new chemicals**, change colors, or create **new reactions**.
*   **`src/systems/ChemistryEngine.ts`**: The "Brain". Logic for mixing colors and triggering reactions.
*   **`src/components/LabScene.tsx`**: The "World". 3D rendering, physics, pouring logic, and the Analyzer machine.
*   **`src/components/LabUI.tsx`**: The "Interface". Buttons, Chat Window, Quest Log.
*   **`src/services/geminiService.ts`**: The "Personality". Instructions for the AI Professor.

## 7. Controls
*   **Left Click + Drag**: Move objects (Beakers, Bottles).
*   **Right Click (Hold)**: Pour liquid from the held object.
*   **Orbit (Left Click Background)**: Rotate camera.
*   **Scroll**: Zoom in/out.
*   **Analyzer:** Drag a beaker to the blue probe to scan pH/Temp.
