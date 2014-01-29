-- Keys are user:troupe keys follows by user:count keys
-- Values are [troupe_id, item_id]
local troupe_id = table.remove(ARGV, 1)
local item_id = table.remove(ARGV, 1)
local time_now = table.remove(ARGV, 1)

local MAX_ITEMS = 100
local MAX_ITEMS_PLUS_ONE = MAX_ITEMS + 1

local key_count = #KEYS/2

local updated_badge_count_positions = {}
local for_upgrade = {}

for i = 1,key_count do
	local user_troupe_key = KEYS[i]
	local user_badge_key = KEYS[i + key_count]

  local key_type = redis.call("TYPE", user_troupe_key)["ok"];

  if key_type == "set" then
  	if redis.call("SADD", user_troupe_key, item_id) > 0 then

  		-- If this is the first for this troupe for this user, the badge count is going to increment
  		if tonumber(redis.call("ZINCRBY", user_badge_key, 1, troupe_id)) == 1 then
  			table.insert(updated_badge_count_positions, i - 1) -- Remember the minus one for base zero in non-lua world
  		end

      -- Figure out if its time to upgrade to a ZSET
      if redis.call("SCARD", user_troupe_key) >= MAX_ITEMS then
        table.insert(for_upgrade, i - 1) -- Remember the minus one for base zero in non-lua world
      end

  	end
  elseif key_type == "none" then
    if redis.call("SADD", user_troupe_key, item_id) > 0 then

      -- If this is the first for this troupe for this user, the badge count is going to increment
      if tonumber(redis.call("ZINCRBY", user_badge_key, 1, troupe_id)) == 1 then
        table.insert(updated_badge_count_positions, i - 1) -- Remember the minus one for base zero in non-lua world
      end

      -- Always less than 100 here (first insert)
    end
  else
    -- We have a ZSET
    if redis.call("ZADD", user_troupe_key, time_now, item_id) > 0 then
      -- DELETE all items below the last 100 ranked items
      redis.call("ZREMRANGEBYRANK", user_badge_key, 0, -MAX_ITEMS_PLUS_ONE)

      redis.call("ZINCRBY", user_badge_key, 1, troupe_id)

      -- Incremement the badge count, but this user:troupe will always already have items, so
      -- theres no need to check if the value returned is one (unlike in the case of a set)
      redis.call("ZINCRBY", user_badge_key, 1, troupe_id)
    end
  end
end

-- Result looks like number_of_badge_count_keys badge_count_key_positions... upgrade_keys...
local result = {}
table.insert(result, #updated_badge_count_positions)
for k, v in pairs(updated_badge_count_positions) do
  table.insert(result, v)
end
for k, v in pairs(for_upgrade) do
  table.insert(result, v)
end
return result