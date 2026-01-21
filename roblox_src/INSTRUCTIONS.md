# Jules' Fix Instructions 🛠️

Hello! It seems the code you had was a "mashup"—three different scripts pasted into one file. That confuses Roblox because it tries to run Server code on the Client and Button code in the Camera script.

Here is how to fix it, step-by-step.

## 🛑 Step 1: The "Ghost Mode" Setting (Crucial!)
If you skip this, the camera will break every time.

1.  In Roblox Studio, look at the **Explorer**.
2.  Click on the **Players** service (yellow/blue people icon).
3.  In the **Properties** window, uncheck **CharacterAutoLoads**.
    *   *Result: When you press Play, you will not spawn. You will be a camera.*

## 🌉 Step 2: The Bridge (RemoteEvent)
We need a way for the Button (Client) to talk to the Server.

1.  In **ReplicatedStorage**, right-click -> **Insert Object** -> **RemoteEvent**.
2.  Rename it to: `SpawnEvent` (Case sensitive!).

## 📜 Step 3: Install the Scripts

### Script A: The Camera & Blur
*   **File:** `MainMenuController.lua`
*   **Location:** `StarterPlayer` -> `StarterPlayerScripts`
*   **Type:** `LocalScript`
*   **Action:** Paste the code from `roblox_src/MainMenuController.lua` here.

### Script B: The Deploy Button
*   **File:** `DeployButton.lua`
*   **Location:** Inside your Button (e.g., `StarterGui` -> `MenuGui` -> `Frame` -> `DeployButton`)
*   **Type:** `LocalScript`
*   **Action:** Paste the code from `roblox_src/DeployButton.lua` here.

### Script C: The Server Manager
*   **File:** `SpawnManager.lua`
*   **Location:** `ServerScriptService`
*   **Type:** `Script` (The normal server one, usually looks like a scroll)
*   **Action:** Paste the code from `roblox_src/SpawnManager.lua` here.

## 🚀 Step 4: Test It!
1.  Press **Play**.
2.  You should see the view from `MenuCamPart`.
3.  Click **Deploy**.
4.  You should spawn!
