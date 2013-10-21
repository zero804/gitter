local user_badge_key = KEYS[1]
local user_troupe_key = KEYS[2]
local email_hash_key = KEYS[3]

-- Values are lrt timestamp, troupeId followed by itemIds,
local troupe_id = table.remove(ARGV, 1)
local user_id = table.remove(ARGV, 1)
local itemIds = ARGV

local updated_badge_count = 0

for i, itemId in ipairs(itemIds) do

	-- If this item has not already been removed.....
	if redis.call("SREM", user_troupe_key, itemId) > 0 then
		-- Then we need to decrement the ZSET for this user for this troupe

		-- If this is the first for this troupe for this user, the badge count is going to increment
		if tonumber(redis.call("ZINCRBY", user_badge_key, -1, troupe_id)) <= 0 then
			redis.call("ZREMRANGEBYSCORE", user_badge_key, '-inf', 0)
			updated_badge_count = 1
		end
	end
end

-- Remove this user from the list of people who may get an email
redis.call("HDEL", email_hash_key, troupe_id..':'..user_id)

return updated_badge_count