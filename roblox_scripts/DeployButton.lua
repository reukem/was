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
	if blur then
		blur.Size = 0
	end

	-- Re-enable standard Roblox UI (Chat, Leaderboard, etc.)
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.All, true)

	-- 3. HIDE MENU
	-- Assuming the button is inside a Frame/ScreenGui.
	-- If button is inside a Frame, Parent.Parent is likely the ScreenGui.
	-- Adjust .Parent references if your UI hierarchy is different.
	local screenGui = button:FindFirstAncestorWhichIsA("ScreenGui")
	if screenGui then
		screenGui.Enabled = false
	else
		button.Parent.Visible = false -- Fallback: just hide parent
	end

	-- 4. SPAWN THE CHARACTER (Fire the Bridge!)
	SpawnEvent:FireServer()
end)
