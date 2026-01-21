-- SPAWN MANAGER (Server Script)
-- Placement: ServerScriptService -> Script

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SpawnEvent = ReplicatedStorage:WaitForChild("SpawnEvent")

SpawnEvent.OnServerEvent:Connect(function(player)
	print(player.Name .. " is deploying!")
	player:LoadCharacter() -- This gives you a body
end)
