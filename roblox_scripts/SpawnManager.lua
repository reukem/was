local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Create the event if it doesn't exist (Optional helper, but safer to create it manually in Studio)
local SpawnEvent = ReplicatedStorage:FindFirstChild("SpawnEvent")
if not SpawnEvent then
	SpawnEvent = Instance.new("RemoteEvent")
	SpawnEvent.Name = "SpawnEvent"
	SpawnEvent.Parent = ReplicatedStorage
	print("Created SpawnEvent in ReplicatedStorage")
end

SpawnEvent.OnServerEvent:Connect(function(player)
	print(player.Name .. " is deploying!")
	player:LoadCharacter() -- This gives you a body
end)
