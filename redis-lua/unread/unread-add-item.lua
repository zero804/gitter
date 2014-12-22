-- Keys are user:troupe keys follows by user:count keys
-- Values are [troupe_id, item_id]
local troupe_id = table.remove(ARGV, 1)
local item_id = table.remove(ARGV, 1)
local time_now = table.remove(ARGV, 1)

local email_hash_key = table.remove(KEYS, 1)

local MAX_ITEMS = 100
local MAX_ITEMS_PLUS_ONE = MAX_ITEMS + 1

-- Update values in the email hash with time_now, if a value does not exist
local userIds = ARGV
for i, user_id in ipairs(userIds) do
  redis.call("HSETNX", email_hash_key, troupe_id..':'..user_id, time_now)
end

local key_count = #KEYS/2

-- local updated_badge_count_positions = {}
-- local for_upgrade = {}
local result = {};

for i = 1,key_count do
	local user_troupe_key = KEYS[i]
	local user_badge_key = KEYS[i + key_count]


  local item_count = -1 -- -1 means do not update
  local update = 0 -- bit flags: 1 = badge_update, 2 = upgrade_key
  local key_type = redis.call("TYPE", user_troupe_key)["ok"];

  if key_type == "set" then
  	if redis.call("SADD", user_troupe_key, item_id) > 0 then

  		-- If this is the first for this troupe for this user, the badge count is going to increment
  		if tonumber(redis.call("ZINCRBY", user_badge_key, 1, troupe_id)) == 1 then
        update = 1
  		end

      item_count = redis.call("SCARD", user_troupe_key)

      -- Figure out if its time to upgrade to a ZSET
      if item_count >= MAX_ITEMS then
        update = update + 2
      end

  	end
  elseif key_type == "none" then
    -- this should always return 1
    if redis.call("SADD", user_troupe_key, item_id) > 0 then
      item_count = 1;                                               -- key was none

      -- If this is the first for this troupe for this user, the badge count is going to increment
      if tonumber(redis.call("ZINCRBY", user_badge_key, 1, troupe_id)) == 1 then
        update = 1
      end

    end
  else
    -- We have a ZSET
    if redis.call("ZADD", user_troupe_key, time_now, item_id) > 0 then
      -- Remove all items below the last 100 ranked items
      local items_removed = redis.call("ZREMRANGEBYRANK", user_troupe_key, 0, -MAX_ITEMS_PLUS_ONE)

      -- Only if no items have been removed should we increment the badge count.
      -- If we're removing items, it means that we've hit the max and should
      -- not be counting
      if items_removed == 0 then
        item_count = redis.call("ZCARD", user_troupe_key)
        redis.call("ZINCRBY", user_badge_key, 1, troupe_id)
      else
        -- If items were removed, the set must have exactly 100 items left in it
        item_count = MAX_ITEMS;
      end
    end
  end

  table.insert(result, item_count)
  table.insert(result, update)

end

return result
