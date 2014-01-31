-- Keys are user:troupe keys follows by user:count keys
-- Values are [troupe_id, item_id]
local troupe_id = table.remove(ARGV, 1)
local item_id = table.remove(ARGV, 1)
local time_now = table.remove(ARGV, 1)

local MAX_ITEMS = 100
local MAX_ITEMS_PLUS_ONE = MAX_ITEMS + 1

local key_count = #KEYS/2

local result = {}

for i = 1,key_count do
	local user_troupe_mention_key = KEYS[i]
	local user_badge_key = KEYS[i + key_count]

  local count = -1;
  local flag = 0;

	if redis.call("SADD", user_troupe_mention_key, item_id) > 0 then
    count = redis.call("SCARD", user_troupe_mention_key);

		-- If this is the first for this troupe for this user, the badge count is going to increment
		if tonumber(redis.call("ZINCRBY", user_badge_key, 1, troupe_id)) == 1 then
      flag = 1
		end
	end

  table.insert(result, count);
  table.insert(result, flag);
end

return result