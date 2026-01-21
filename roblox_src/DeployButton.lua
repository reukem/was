-- DEPLOY BUTTON (LocalScript)
-- Placement: Inside your Deploy Button (e.g., StarterGui -> ScreenGui -> Frame -> TextButton -> LocalScript)

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local StarterGui = game:GetService("StarterGui")
local Workspace = game:GetService("Workspace")

local button = script.Parent
local camera = Workspace.CurrentCamera
local SpawnEvent = ReplicatedStorage:WaitForChild("SpawnEvent")

button.MouseButton1Click:Connect(function()
	print("Requesting deployment...")

	-- 1. UNLOCK THE CAMERA
	RunService:UnbindFromRenderStep("MenuCamLock")
	camera.CameraType = Enum.CameraType.Custom

	-- 2. RESET LIGHTING/UI
	local blur = Lighting:FindFirstChild("MenuBlur")
	if blur then blur.Size = 0 end
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.All, true)

	-- 3. HIDE MENU
	-- Assuming structure: ScreenGui -> Frame -> Button.
	-- If your structure is just ScreenGui -> Button, change this to button.Parent.Enabled = false
	pcall(function()
		button.Parent.Parent.Enabled = false
	end)

	-- 4. SPAWN THE CHARACTER (Fire the Bridge!)
	SpawnEvent:FireServer()
end)
