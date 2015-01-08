-- Keys are [user:troupe,user:count] keys followed by [user_troupe_mention_key, user_mention_key]
-- Values are [usercount, troupe_id, item_id, time, userIds....]
local user_count = table.remove(ARGV, 1) 
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

local result = {};

for i = 1,user_count do
	local user_troupe_key = table.remove(KEYS, 1)
	local user_badge_key =  table.remove(KEYS, 1)


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

-- Now deal with the mentions
while #KEYS > 0 do
  local user_troupe_mention_key = table.remove(KEYS, 1)
  local user_mention_key = table.remove(KEYS, 1)

  local count = -1;

  if redis.call("SADD", user_troupe_mention_key, item_id) > 0 then
    count = redis.call("SCARD", user_troupe_mention_key);
    -- If count equals exactly one then this is the first time this user has been mentioned in this
    -- room, so we'll need to add this troupeId to the users mention key
    if count == 1 then
      redis.call("SADD", user_mention_key, troupe_id)
    end
  end

  table.insert(result, count);
end


return result
