-- Keys are user:troupe keys follows by user:count keys
-- Values are [troupe_id, item_id]
local troupe_id = table.remove(ARGV, 1)
local item_id = table.remove(ARGV, 1)

local key_count = #KEYS/2

local updated_badge_count_positions = {}

for i = 1,key_count do
	local user_troupe_key = KEYS[i]
	local user_badge_key = KEYS[i + key_count]

	if redis.call("SADD", user_troupe_key, item_id) > 0 then

		-- If this is the first for this troupe for this user, the badge count is going to increment
		if tonumber(redis.call("ZINCRBY", user_badge_key, 1, troupe_id)) == 1 then
			table.insert(updated_badge_count_positions, i - 1) -- Remember the minus one for base zero in non-lua world
		end
	end
end

return updated_badge_count_positions