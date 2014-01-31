-- Keys are user:troupe keys follows by user:count keys
-- Values are [troupe_id, item_id]
local item_id = table.remove(ARGV, 1)
local key_count = #KEYS/2

local result = {}

for i = 1,key_count do
	local user_troupe_mention_key = KEYS[i]
	local user_badge_key = KEYS[i + key_count]

  local count = -1;

	if redis.call("SADD", user_troupe_mention_key, item_id) > 0 then
    count = redis.call("SCARD", user_troupe_mention_key);
	end

  table.insert(result, count);
end

return result