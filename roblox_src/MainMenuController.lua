-- MAIN MENU CONTROLLER (LocalScript)
-- Placement: StarterPlayer -> StarterPlayerScripts -> LocalScript

print("Hello world!")

local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local StarterGui = game:GetService("StarterGui")

local camera = Workspace.CurrentCamera
local player = Players.LocalPlayer

-- 1. CONFIGURATION
local PART_NAME = "MenuCamPart" -- Must match your part name exactly
local BLUR_SIZE = 24 -- How blurry? (0 to 24)

-- 2. WAIT FOR GAME TO LOAD
if not player:IsLoaded() then
	player.Loaded:Wait()
end

-- 3. SETUP THE BLUR (Cinematic Effect)
local blur = Lighting:FindFirstChild("MenuBlur")
if not blur then
	blur = Instance.new("BlurEffect")
	blur.Name = "MenuBlur"
	blur.Size = 0
	blur.Parent = Lighting
end
blur.Size = BLUR_SIZE

-- 4. HIDE THE UI (Healthbar, etc)
pcall(function()
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.All, false)
end)

-- 5. THE CAMERA LOCK FUNCTION
local camPart = Workspace:WaitForChild(PART_NAME, 10) -- Wait 10s for the part

if camPart then
	print("Menu Camera Found. Locking View.")

	local function lockCamera()
		camera.CameraType = Enum.CameraType.Scriptable
		camera.CFrame = camPart.CFrame
	end

	-- BIND IT: This runs every single frame, overriding Roblox's default camera
	RunService:BindToRenderStep("MenuCamLock", Enum.RenderPriority.Camera.Value + 1, lockCamera)
else
	warn("CRITICAL: Could not find '" .. PART_NAME .. "'. Did you create the part?")
end
