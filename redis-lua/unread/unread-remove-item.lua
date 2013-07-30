-- Keys are user:troupe keys follows by user:count keys
-- Values are [troupeId, itemId]
local troupeId = ARGV[1]
local item_id = ARGV[2];

local key_count = #KEYS/2

local updated_badge_count_positions = {}

for i = 1,key_count do
	local user_troupe_key = KEYS[i]
	local user_badge_key = KEYS[i + key_count]

	-- If this item has not already been removed.....
	if redis.call("SREM", user_troupe_key, item_id) > 0 then
		-- Then we need to decrement the ZSET for this user for this troupe

		-- If this is the first for this troupe for this user, the badge count is going to increment
		if tonumber(redis.call("ZINCRBY", user_badge_key, -1, troupe_id)) <= 0 then
			redis.call("ZREMRANGEBYSCORE", user_badge_key, '-inf', 0)

			table.insert(updated_badge_count_positions, i - 1) -- Remember the minus one for base zero in non-lua world
		end
	end
end

return updated_badge_count_positions